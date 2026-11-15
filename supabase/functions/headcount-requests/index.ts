import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Contract-compliant error shape: { code, message, details, hint }. */
function errorResponse(code: string, message: string, status: number) {
  return jsonResponse({ code, message, details: null, hint: null }, status);
}

// ---------------------------------------------------------------------------
// Edge Function
// ---------------------------------------------------------------------------

serve(async (req) => {
  // ── CORS preflight ──────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Method Not Allowed.", 405);
  }

  // ── Environment ─────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const authorization = req.headers.get("Authorization");

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !supabaseServiceRoleKey ||
    !resendApiKey ||
    !resendFromEmail
  ) {
    console.error("Headcount decision function is missing required configuration.");
    return errorResponse("FUNCTION_NOT_CONFIGURED", "Function is not configured.", 500);
  }

  if (!authorization) {
    return errorResponse("UNAUTHORIZED", "Unauthorized.", 401);
  }

  // ── Parse path parameter ────────────────────────────────────────────
  const requestId = new URL(req.url).pathname.match(
    /\/headcount-requests\/([^/]+)\/decision\/?$/,
  )?.[1];

  if (!requestId || !uuidPattern.test(requestId)) {
    return errorResponse(
      "INVALID_REQUEST",
      "A valid headcount request ID is required.",
      400,
    );
  }

  // ── Parse & validate body ───────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  if (
    body === null ||
    typeof body !== "object" ||
    !("decision" in body) ||
    (body.decision !== "approve" && body.decision !== "reject")
  ) {
    return errorResponse(
      "INVALID_REQUEST",
      "decision must be either 'approve' or 'reject'.",
      400,
    );
  }

  const reason =
    "reason" in body && typeof body.reason === "string" ? body.reason : null;

  // ── Authenticate caller ─────────────────────────────────────────────
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    return errorResponse("UNAUTHORIZED", "Unauthorized.", 401);
  }

  // ── Verify active organizer profile ─────────────────────────────────
  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: organizer, error: organizerError } = await serviceClient
    .from("organizer_profiles")
    .select("id")
    .eq("id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (organizerError) {
    console.error("Failed to verify organizer:", organizerError.message);
    return errorResponse("INTERNAL_ERROR", "Failed to verify organizer.", 500);
  }

  if (!organizer) {
    return errorResponse("FORBIDDEN", "Forbidden.", 403);
  }

  // ── Fetch headcount request ─────────────────────────────────────────
  const { data: hir, error: hirError } = await serviceClient
    .from("headcount_increase_requests")
    .select("id, invitation_id, requested_additional_heads, status, note, requested_at, reviewed_by, reviewed_at, review_reason")
    .eq("id", requestId)
    .maybeSingle();

  if (hirError) {
    console.error("Failed to fetch headcount request:", hirError.message);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch headcount request.", 500);
  }

  if (!hir) {
    return errorResponse("NOT_FOUND", "Headcount request not found.", 404);
  }

  if (hir.status !== "pending") {
    return errorResponse("ALREADY_DECIDED", "This request has already been decided.", 409);
  }

  // ── Fetch invitation & verify event ownership ───────────────────────
  const { data: invitation, error: invitationError } = await serviceClient
    .from("invitations")
    .select("id, event_id, guest_id, max_party_size")
    .eq("id", hir.invitation_id)
    .maybeSingle();

  if (invitationError) {
    console.error("Failed to fetch invitation:", invitationError.message);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch invitation.", 500);
  }

  if (!invitation) {
    return errorResponse("NOT_FOUND", "Associated invitation not found.", 404);
  }

  const { data: event, error: eventError } = await serviceClient
    .from("events")
    .select("id, organizer_id, title, capacity")
    .eq("id", invitation.event_id)
    .maybeSingle();

  if (eventError) {
    console.error("Failed to fetch event:", eventError.message);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch event.", 500);
  }

  if (!event || event.organizer_id !== user.id) {
    return errorResponse("FORBIDDEN", "Forbidden.", 403);
  }

  // ── Decision logic ──────────────────────────────────────────────────
  const newStatus = body.decision === "approve" ? "approved" : "rejected";
  const oldMaxPartySize = invitation.max_party_size;
  let newMaxPartySize = oldMaxPartySize;

  if (body.decision === "approve") {
    // Capacity soft-check (advisory — does not block approval)
    const { data: capacityRows, error: capacityError } = await serviceClient
      .from("invitations")
      .select("max_party_size")
      .eq("event_id", invitation.event_id);

    // Fallback: sum max_party_size across all invitations for this event
    if (!capacityError && capacityRows) {
      const totalAllocated = (capacityRows as { max_party_size: number }[]).reduce(
        (sum: number, row: { max_party_size: number }) => sum + row.max_party_size,
        0,
      );
      const projectedTotal = totalAllocated + hir.requested_additional_heads;
      if (projectedTotal > event.capacity) {
        console.warn(
          `Capacity soft-check: approving will bring total allocated (${projectedTotal}) ` +
          `above event capacity (${event.capacity}). Proceeding anyway.`,
        );
      }
    }

    // Update invitation max_party_size
    newMaxPartySize = oldMaxPartySize + hir.requested_additional_heads;
    const { error: updateInvError } = await serviceClient
      .from("invitations")
      .update({ max_party_size: newMaxPartySize })
      .eq("id", invitation.id);

    if (updateInvError) {
      console.error("Failed to update invitation max_party_size:", updateInvError.message);
      return errorResponse("INTERNAL_ERROR", "Failed to update invitation party size.", 500);
    }
  }

  // Update headcount request status (optimistic lock on status = 'pending')
  const { data: updatedHir, error: updateHirError } = await serviceClient
    .from("headcount_increase_requests")
    .update({
      status: newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_reason: reason,
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id, invitation_id, requested_additional_heads, status, note, requested_at, reviewed_by, reviewed_at, review_reason")
    .maybeSingle();

  if (updateHirError) {
    console.error("Failed to update headcount request:", updateHirError.message);
    return errorResponse("INTERNAL_ERROR", "Failed to update headcount request.", 500);
  }

  if (!updatedHir) {
    return errorResponse("ALREADY_DECIDED", "This request has already been decided.", 409);
  }

  // ── Audit log ───────────────────────────────────────────────────────
  const auditAction = body.decision === "approve"
    ? "headcount_request.approved"
    : "headcount_request.rejected";

  const { error: auditError } = await serviceClient
    .from("audit_log_entries")
    .insert({
      actor_type: "organizer",
      actor_id: user.id,
      action: auditAction,
      entity_type: "headcount_increase_request",
      entity_id: requestId,
      old_value: { status: "pending", max_party_size: oldMaxPartySize },
      new_value: {
        status: newStatus,
        max_party_size: newMaxPartySize,
        requested_additional_heads: hir.requested_additional_heads,
      },
      reason: reason,
    });

  if (auditError) {
    console.error("Failed to insert audit log entry:", auditError.message);
    // Decision was saved — audit failure is non-fatal but logged
  }

  // ── Email notification ──────────────────────────────────────────────
  const { data: guest, error: guestError } = await serviceClient
    .from("guests")
    .select("email, full_name")
    .eq("id", invitation.guest_id)
    .maybeSingle();

  if (guestError || !guest) {
    console.error("Failed to fetch guest for notification:", guestError?.message);
    return jsonResponse(updatedHir, 200);
  }

  // Insert email log as queued
  const { data: emailLog, error: logError } = await serviceClient
    .from("email_logs")
    .insert({
      event_id: event.id,
      invitation_id: invitation.id,
      recipient_email: guest.email,
      type: "headcount_request_decided",
      status: "queued",
    })
    .select("id")
    .single();

  if (logError || !emailLog) {
    console.error("Failed to create email log:", logError?.message);
    // Decision was saved — email log failure is non-fatal
    return jsonResponse(updatedHir, 200);
  }

  // Build email content
  const isApproval = body.decision === "approve";
  const subject = isApproval
    ? `Your headcount request for ${event.title} has been approved`
    : `Your headcount request for ${event.title} has been declined`;

  const textLines = isApproval
    ? [
        `Hi ${guest.full_name},`,
        `Your request for ${hir.requested_additional_heads} additional guest(s) at ${event.title} has been approved.`,
        `Your party size has been increased from ${oldMaxPartySize} to ${newMaxPartySize}.`,
        reason ? `Organizer's note: ${reason}` : null,
      ]
    : [
        `Hi ${guest.full_name},`,
        `Your request for ${hir.requested_additional_heads} additional guest(s) at ${event.title} has been declined.`,
        reason ? `Reason: ${reason}` : null,
      ];

  const markEmailFailed = async (failureReason: string) => {
    const { error: updateError } = await serviceClient
      .from("email_logs")
      .update({ status: "failed" })
      .eq("id", emailLog.id);

    if (updateError) {
      console.error("Failed to mark email log as failed:", updateError.message);
    }
    console.error("Failed to send headcount decision notification:", failureReason);
  };

  // Send via Resend
  let resendResponse: Response;
  try {
    resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [guest.email],
        subject,
        text: textLines
          .filter((line): line is string => line !== null)
          .join("\n\n"),
      }),
    });
  } catch (error) {
    await markEmailFailed(
      error instanceof Error ? error.message : "Resend request failed.",
    );
    return jsonResponse(updatedHir, 200);
  }

  let resendBody: unknown;
  try {
    resendBody = await resendResponse.json();
  } catch {
    await markEmailFailed(
      `Resend returned an invalid response (${resendResponse.status}).`,
    );
    return jsonResponse(updatedHir, 200);
  }

  if (!resendResponse.ok) {
    await markEmailFailed(
      `Resend request failed (${resendResponse.status}): ${JSON.stringify(resendBody)}`,
    );
    return jsonResponse(updatedHir, 200);
  }

  if (
    resendBody === null ||
    typeof resendBody !== "object" ||
    !("id" in resendBody) ||
    typeof resendBody.id !== "string"
  ) {
    await markEmailFailed("Resend response did not include a message ID.");
    return jsonResponse(updatedHir, 200);
  }

  // Mark email as sent
  const { error: sentLogError } = await serviceClient
    .from("email_logs")
    .update({
      status: "sent",
      provider_message_id: resendBody.id,
      sent_at: new Date().toISOString(),
    })
    .eq("id", emailLog.id);

  if (sentLogError) {
    console.error("Email sent but failed to update email log:", sentLogError.message);
  }

  // ── Response ────────────────────────────────────────────────────────
  return jsonResponse(updatedHir, 200);
});


import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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

function errorResponse(code: string, message: string, status: number) {
  return jsonResponse({ code, message, details: null, hint: null }, status);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Method Not Allowed.", 405);
  }

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
    console.error("Headcount submission function is missing required configuration.");
    return errorResponse("FUNCTION_NOT_CONFIGURED", "Function is not configured.", 500);
  }

  if (!authorization) {
    return errorResponse("UNAUTHORIZED", "Unauthorized.", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  if (
    body === null ||
    typeof body !== "object" ||
    !("invitation_id" in body) ||
    typeof body.invitation_id !== "string" ||
    !uuidPattern.test(body.invitation_id) ||
    !("requested_additional_heads" in body) ||
    typeof body.requested_additional_heads !== "number" ||
    !Number.isInteger(body.requested_additional_heads) ||
    body.requested_additional_heads < 1 ||
    ("note" in body && body.note !== null && typeof body.note !== "string")
  ) {
    return errorResponse(
      "INVALID_REQUEST",
      "A valid invitation_id and positive requested_additional_heads are required.",
      400,
    );
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    return errorResponse("UNAUTHORIZED", "Unauthorized.", 401);
  }

  const { data: headcountRequest, error: requestError } = await authClient
    .from("headcount_increase_requests")
    .insert({
      invitation_id: body.invitation_id,
      requested_additional_heads: body.requested_additional_heads,
      note: "note" in body ? body.note : null,
    })
    .select("*")
    .single();

  if (requestError || !headcountRequest) {
    if (requestError?.code === "23505") {
      return errorResponse(
        "PENDING_REQUEST_EXISTS",
        "A pending headcount request already exists for this invitation.",
        409,
      );
    }

    if (requestError?.code === "42501") {
      return errorResponse(
        "FORBIDDEN",
        "The invitation is not eligible for a headcount request.",
        403,
      );
    }

    console.error("Failed to submit headcount request:", requestError?.message);
    return errorResponse("REQUEST_FAILED", "Failed to submit headcount request.", 500);
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: invitation, error: invitationError } = await serviceClient
    .from("invitations")
    .select("id, event_id, guest_id")
    .eq("id", headcountRequest.invitation_id)
    .maybeSingle();

  if (invitationError || !invitation) {
    console.error(
      "Headcount request was saved, but its invitation could not be fetched:",
      invitationError?.message,
    );
    return errorResponse(
      "NOTIFICATION_CONTEXT_FAILED",
      "Request was saved, but organizer notification details could not be loaded.",
      502,
    );
  }

  const { data: event, error: eventError } = await serviceClient
    .from("events")
    .select("id, title, organizer_id")
    .eq("id", invitation.event_id)
    .maybeSingle();

  if (eventError || !event) {
    console.error(
      "Headcount request was saved, but its event could not be fetched:",
      eventError?.message,
    );
    return errorResponse(
      "NOTIFICATION_CONTEXT_FAILED",
      "Request was saved, but organizer notification details could not be loaded.",
      502,
    );
  }

  const { data: guest, error: guestError } = await serviceClient
    .from("guests")
    .select("full_name")
    .eq("id", invitation.guest_id)
    .maybeSingle();

  if (guestError || !guest) {
    console.error(
      "Headcount request was saved, but its guest could not be fetched:",
      guestError?.message,
    );
    return errorResponse(
      "NOTIFICATION_CONTEXT_FAILED",
      "Request was saved, but organizer notification details could not be loaded.",
      502,
    );
  }

  const { data: organizer, error: organizerError } = await serviceClient
    .from("organizer_profiles")
    .select("email")
    .eq("id", event.organizer_id)
    .maybeSingle();

  if (organizerError || !organizer) {
    console.error(
      "Headcount request was saved, but its organizer could not be fetched:",
      organizerError?.message,
    );
    return errorResponse(
      "NOTIFICATION_CONTEXT_FAILED",
      "Request was saved, but organizer notification details could not be loaded.",
      502,
    );
  }

  const { data: emailLog, error: logError } = await serviceClient
    .from("email_logs")
    .insert({
      event_id: event.id,
      invitation_id: invitation.id,
      recipient_email: organizer.email,
      type: "headcount_request_submitted",
      status: "queued",
    })
    .select("id")
    .single();

  if (logError || !emailLog) {
    console.error(
      "Headcount request was saved, but its email log could not be created:",
      logError?.message,
    );
    return errorResponse(
      "EMAIL_LOG_FAILED",
      "Request was saved, but the organizer notification could not be logged or sent.",
      500,
    );
  }

  const markEmailFailed = async (reason: string) => {
    const { data: failedEmailLog, error: updateError } = await serviceClient
      .from("email_logs")
      .update({ status: "failed" })
      .eq("id", emailLog.id)
      .select("id")
      .maybeSingle();

    if (updateError || !failedEmailLog) {
      console.error(
        "Failed to mark headcount notification as failed:",
        updateError?.message ?? "No email log row was updated.",
      );
    }

    console.error("Failed to send headcount notification:", reason);
    return errorResponse(
      "NOTIFICATION_FAILED",
      updateError || !failedEmailLog
        ? "Request was saved, but the organizer notification failed and its log could not be updated."
        : "Request was saved, but the organizer notification could not be sent.",
      502,
    );
  };

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
        to: [organizer.email],
        subject: `New headcount request for ${event.title}`,
        text: [
          `${guest.full_name} has submitted a headcount increase request for ${event.title}.`,
          `Additional attendees requested: ${headcountRequest.requested_additional_heads}.`,
          headcountRequest.note ? `Note: ${headcountRequest.note}` : null,
        ].filter((line): line is string => line !== null).join("\n\n"),
      }),
    });
  } catch (error) {
    return await markEmailFailed(
      error instanceof Error ? error.message : "Resend request failed.",
    );
  }

  let resendBody: unknown;
  try {
    resendBody = await resendResponse.json();
  } catch {
    return await markEmailFailed(
      `Resend returned an invalid response (${resendResponse.status}).`,
    );
  }

  if (!resendResponse.ok) {
    return await markEmailFailed(
      `Resend request failed (${resendResponse.status}): ${JSON.stringify(resendBody)}`,
    );
  }

  if (
    resendBody === null ||
    typeof resendBody !== "object" ||
    !("id" in resendBody) ||
    typeof resendBody.id !== "string"
  ) {
    return await markEmailFailed("Resend response did not include a message ID.");
  }

  const { data: sentEmailLog, error: sentLogError } = await serviceClient
    .from("email_logs")
    .update({
      status: "sent",
      provider_message_id: resendBody.id,
      sent_at: new Date().toISOString(),
    })
    .eq("id", emailLog.id)
    .select("id")
    .maybeSingle();

  if (sentLogError || !sentEmailLog) {
    console.error(
      "Organizer was notified, but the email log could not be updated:",
      sentLogError?.message ?? "No email log row was updated.",
    );
    return errorResponse(
      "EMAIL_LOG_UPDATE_FAILED",
      "Request was saved and the organizer was notified, but the email log could not be updated.",
      500,
    );
  }

  return jsonResponse(headcountRequest, 201);
});

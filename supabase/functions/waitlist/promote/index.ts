import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-service-role-worker, x-worker-role, x-worker-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

async function ensureOrganizerForEvent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  eventId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organizer_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

function isScheduledServiceRoleWorkerRequest(
  headers: Headers,
  serviceRoleKey: string,
): boolean {
  const authorization = headers.get("Authorization");
  if (authorization === `Bearer ${serviceRoleKey}` || authorization === serviceRoleKey) {
    return true;
  }

  const workerHeader = headers.get("x-service-role-worker");
  if (workerHeader === "true" || workerHeader === "1") {
    return true;
  }

  const workerRole = headers.get("x-worker-role");
  const workerSecret = headers.get("x-worker-secret");
  return workerRole === "scheduled-worker" && workerSecret === serviceRoleKey;
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method Not Allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const authorization = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !resendApiKey || !resendFromEmail) {
      return jsonResponse({ error: "Function is not configured." }, 500);
    }

    if (!authorization) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON." }, 400);
    }

    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Request body must be a JSON object." }, 400);
    }

    const requestBody = body as Record<string, unknown>;

    if (!("event_id" in requestBody) || !isUuid(requestBody.event_id)) {
      return jsonResponse({ error: "event_id must be a valid UUID." }, 400);
    }

    const maxPromote = "max_promote" in requestBody && requestBody.max_promote !== undefined
      ? requestBody.max_promote
      : 10;

    if (typeof maxPromote !== "number" || !Number.isInteger(maxPromote) || maxPromote < 1) {
      return jsonResponse({ error: "max_promote must be a positive integer." }, 400);
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const isServiceRoleRequest = isScheduledServiceRoleWorkerRequest(req.headers, supabaseServiceRoleKey);

    if (!isServiceRoleRequest) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      });

      const { data: { user }, error: authError } = await authClient.auth.getUser();
      if (authError || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      try {
        const isOrganizer = await ensureOrganizerForEvent(serviceClient, user.id, requestBody.event_id as string);
        if (!isOrganizer) {
          return jsonResponse({ error: "Forbidden" }, 403);
        }
      } catch (error) {
        console.error("Error verifying organizer access:", error);
        return jsonResponse({ error: "Failed to verify organizer access." }, 500);
      }
    }

    const { data: eventData, error: eventError } = await serviceClient
      .from("events")
      .select("capacity")
      .eq("id", requestBody.event_id as string)
      .maybeSingle();

    if (eventError) {
      console.error("Error fetching event capacity:", eventError.message);
      return jsonResponse({ error: "Failed to load event capacity." }, 500);
    }

    if (!eventData || eventData.capacity == null) {
      return jsonResponse({ error: "Event capacity not found." }, 404);
    }

    const { data: approvedInvitations, error: headcountError } = await serviceClient
      .from("invitations")
      .select("party_size")
      .eq("event_id", requestBody.event_id as string)
      .eq("status", "accepted");

    if (headcountError) {
      console.error("Error calculating approved headcount:", headcountError.message);
      return jsonResponse({ error: "Failed to calculate approved headcount." }, 500);
    }

    const totalApprovedPartySize = (approvedInvitations ?? []).reduce(
      (sum, invitation) => sum + Number(invitation.party_size ?? 0),
      0,
    );

    const headroom = Number(eventData.capacity) - totalApprovedPartySize;
    if (headroom <= 0) {
      return jsonResponse({ promoted_count: 0, remaining_capacity: 0 }, 200);
    }

    const effectiveMaxPromote = Math.min(maxPromote, headroom);
    const { data: promotedRows, error: promoteError } = await serviceClient.rpc(
      "promote_waitlist_atomic",
      {
        p_event_id: requestBody.event_id as string,
        p_headroom: headroom,
        p_max_promote: effectiveMaxPromote,
      },
    );

    if (promoteError) {
      console.error("Failed to promote waitlisted invitations:", promoteError.message);
      return jsonResponse({ error: "Failed to promote waitlisted invitations." }, 500);
    }

    const promotedInvitations = Array.isArray(promotedRows) ? promotedRows : [];
    const promotedInvitationIds: string[] = [];
    const promotedPartySizeTotal = promotedInvitations.reduce(
      (sum, row) => sum + Number(row.party_size ?? 0),
      0,
    );
    const auditEntries: Array<{
      event_id: string;
      action: string;
      entity_type: string;
      entity_id: string;
      details: Record<string, unknown>;
    }> = [];

    for (const row of promotedInvitations) {
      const { data: invitation, error: invitationError } = await serviceClient
        .from("invitations")
        .select("id, event_id, guest_id, guests(email, full_name)")
        .eq("id", row.id)
        .maybeSingle();

      if (invitationError || !invitation) {
        console.error("Error fetching promoted invitation details:", invitationError?.message ?? "unknown");
        return jsonResponse({ error: "Failed to load promoted invitation details." }, 500);
      }

      promotedInvitationIds.push(invitation.id);

      const guestEmail = Array.isArray(invitation.guests)
        ? invitation.guests[0]?.email
        : invitation.guests?.email;

      if (!guestEmail) {
        console.error(`Invitation ${invitation.id} has no guest email for notification.`);
        return jsonResponse({ error: "Promoted invitation is missing guest email." }, 500);
      }

      let providerMessageId: string | null = null;
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: [guestEmail],
            subject: "You have been promoted from the waitlist",
            text: "A spot opened up for the event and your invitation has been promoted from the waitlist.",
          }),
        });

        const emailResult = await emailResponse.json();
        if (!emailResponse.ok || typeof emailResult?.id !== "string") {
          throw new Error(`Resend returned non-OK response: ${emailResponse.status}`);
        }

        providerMessageId = emailResult.id;
      } catch (error) {
        console.error("Failed to send waitlist promotion email:", error);
        await serviceClient.from("email_logs").insert({
          event_id: invitation.event_id,
          invitation_id: invitation.id,
          recipient_email: guestEmail,
          type: "waitlist_promoted",
          status: "failed",
        });
        return jsonResponse({ error: "Promotion succeeded but email dispatch failed." }, 500);
      }

      const { error: emailLogError } = await serviceClient.from("email_logs").insert({
        event_id: invitation.event_id,
        invitation_id: invitation.id,
        recipient_email: guestEmail,
        type: "waitlist_promoted",
        status: "sent",
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
      });

      if (emailLogError) {
        console.error("Failed to log waitlist promotion email:", emailLogError.message);
        return jsonResponse({ error: "Promotion succeeded but email logging failed." }, 500);
      }

      auditEntries.push({
        event_id: invitation.event_id,
        action: "waitlist.promoted",
        entity_type: "invitation",
        entity_id: invitation.id,
        details: {
          guest_email: guestEmail,
          provider_message_id: providerMessageId,
        },
      });
    }

    if (auditEntries.length > 0) {
      const { error: auditError } = await serviceClient.from("audit_log_entries").insert(auditEntries);
      if (auditError) {
        console.error("Failed to write waitlist promotion audit log:", auditError.message);
        return jsonResponse({ error: "Promotion succeeded but audit logging failed." }, 500);
      }
    }

    return jsonResponse({
      promoted_count: promotedInvitationIds.length,
      remaining_capacity: Math.max(headroom - promotedPartySizeTotal, 0),
    }, 200);
  } catch (error) {
    console.error("Unexpected waitlist promotion error:", error);
    return jsonResponse(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

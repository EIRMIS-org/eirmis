import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(value);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !resendApiKey ||
    !resendFromEmail) {
    console.error("Waitlist promotion function is missing required configuration.");
    return jsonResponse({ error: "Function is not configured." }, 500);
  }
  if (!authorization) return jsonResponse({ error: "Unauthorized" }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  if (body === null || typeof body !== "object" || !("event_id" in body) ||
    !isUuid(body.event_id)) {
    return jsonResponse({ error: "event_id must be a valid UUID." }, 400);
  }
  const maxPromotions = "max_promotions" in body &&
      body.max_promotions !== undefined
    ? body.max_promotions
    : 1;
  if (typeof maxPromotions !== "number" || !Number.isInteger(maxPromotions) ||
    maxPromotions < 1) {
    return jsonResponse({ error: "max_promotions must be a positive integer." }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const isServiceRoleRequest = authorization === `Bearer ${serviceRoleKey}`;
  let actorId: string | null = null;
  if (!isServiceRoleRequest) {
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);
    actorId = user.id;

    const { data: organizer, error: organizerError } = await serviceClient
      .from("organizer_profiles")
      .select("id")
      .eq("id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (organizerError) {
      console.error("Failed to verify organizer:", organizerError.message);
      return jsonResponse({ error: "Failed to verify organizer." }, 500);
    }
    if (!organizer) return jsonResponse({ error: "Forbidden" }, 403);

    const { data: event, error: eventError } = await serviceClient
      .from("events")
      .select("id")
      .eq("id", body.event_id)
      .eq("organizer_id", user.id)
      .maybeSingle();
    if (eventError) {
      console.error("Failed to verify event ownership:", eventError.message);
      return jsonResponse({ error: "Failed to verify event ownership." }, 500);
    }
    if (!event) return jsonResponse({ error: "Forbidden" }, 403);
  }

  const { data: promotedRows, error: promoteError } = await serviceClient.rpc(
    "promote_waitlist_fifo",
    { p_event_id: body.event_id, p_max_promotions: maxPromotions },
  );
  if (promoteError) {
    console.error("Failed to promote waitlisted invitations:", promoteError.message);
    return jsonResponse({ error: "Failed to promote waitlisted invitations." }, 500);
  }

  const promotedInvitationIds: string[] = [];
  for (const promotedRow of promotedRows ?? []) {
    const { data: invitation, error: invitationError } = await serviceClient
      .from("invitations")
      .select("id, event_id, guests(email, full_name)")
      .eq("id", promotedRow.id)
      .single();
    if (invitationError || !invitation) {
      console.error("Failed to fetch promoted invitation:", invitationError?.message);
      return jsonResponse({ error: "Failed to fetch promoted invitation." }, 500);
    }

    promotedInvitationIds.push(invitation.id);
    const guest = Array.isArray(invitation.guests)
      ? invitation.guests[0]
      : invitation.guests;
    if (!guest?.email) {
      console.error(`Waitlisted invitation ${invitation.id} has no guest email.`);
      return jsonResponse({ error: "Promoted invitation has no guest email." }, 500);
    }

    let providerMessageId: string;
    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [guest.email],
          subject: "Your EIRMIS invitation is now available",
          text: "A place is now available for this event. Your invitation has been promoted from the waitlist.",
        }),
      });
      const emailBody = await emailResponse.json();
      if (!emailResponse.ok || typeof emailBody?.id !== "string") {
        throw new Error(`Resend request failed (${emailResponse.status}).`);
      }
      providerMessageId = emailBody.id;
    } catch (error) {
      console.error("Failed to send waitlist promotion email:", error);
      await serviceClient.from("email_logs").insert({
        event_id: invitation.event_id,
        invitation_id: invitation.id,
        recipient_email: guest.email,
        type: "waitlist_promoted",
        status: "failed",
      });
      return jsonResponse({ error: "Invitation promoted, but notification failed." }, 502);
    }

    const { data: emailLog, error: emailLogError } = await serviceClient
      .from("email_logs")
      .insert({
        event_id: invitation.event_id,
        invitation_id: invitation.id,
        recipient_email: guest.email,
        type: "waitlist_promoted",
        status: "sent",
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (emailLogError) {
      console.error("Failed to record waitlist promotion email:", emailLogError.message);
      return jsonResponse({ error: "Promotion completed, but email logging failed." }, 500);
    }

    const { error: auditError } = await serviceClient.from("audit_log_entries").insert({
      actor_type: isServiceRoleRequest ? "system" : "organizer",
      actor_id: actorId,
      action: "invitation.waitlist_promoted",
      entity_type: "invitation",
      entity_id: invitation.id,
      new_value: { email_log_id: emailLog.id, provider_message_id: providerMessageId },
    });
    if (auditError) {
      console.error("Failed to record waitlist promotion audit:", auditError.message);
      return jsonResponse({ error: "Promotion completed, but audit logging failed." }, 500);
    }
  }

  return jsonResponse({ promoted_count: promotedInvitationIds.length, promoted_invitation_ids: promotedInvitationIds });
});

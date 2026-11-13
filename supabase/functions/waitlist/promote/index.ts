import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

serve(async (req) => {
  try {
    const { pathname: requestPath } = new URL(req.url);
    if (
      requestPath !== "/functions/v1/waitlist/promote" &&
      requestPath !== "/waitlist/promote" &&
      requestPath !== "/promote"
    ) {
      return jsonResponse({ error: "Not Found" }, 404);
    }

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

    const isServiceRoleRequest = authorization === `Bearer ${supabaseServiceRoleKey}`;
    if (!isServiceRoleRequest && !authorization.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON." }, 400);
    }

    if (!isRecord(body)) {
      return jsonResponse({ error: "Request body must be a JSON object." }, 400);
    }

    const requestBody = body;
    const eventId = requestBody.event_id;

    if (!isUuid(eventId)) {
      return jsonResponse({ error: "event_id must be a valid UUID." }, 400);
    }

    const maxPromotions = "max_promotions" in requestBody && requestBody.max_promotions !== undefined
      ? requestBody.max_promotions
      : 1;

    if (typeof maxPromotions !== "number" || !Number.isInteger(maxPromotions) || maxPromotions < 1) {
      return jsonResponse({ error: "max_promotions must be a positive integer." }, 400);
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    let actorId: string | null = null;

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
      actorId = user.id;

      try {
        const { data: event, error: eventError } = await serviceClient
          .from("events")
          .select("id")
          .eq("id", eventId)
          .eq("organizer_id", user.id)
          .maybeSingle();

        if (eventError) {
          throw eventError;
        }
        if (!event) {
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
      .eq("id", eventId)
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
      .eq("event_id", eventId)
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
      return jsonResponse({ promoted_count: 0, promoted_invitation_ids: [] }, 200);
    }

    const effectiveMaxPromotions = Math.min(maxPromotions, headroom);
    const { data: promotedRows, error: promoteError } = await serviceClient.rpc(
      "promote_waitlist_atomic",
      {
        p_event_id: eventId,
        p_headroom: headroom,
        p_max_promote: effectiveMaxPromotions,
      },
    );

    if (promoteError) {
      console.error("Failed to promote waitlisted invitations:", promoteError.message);
      return jsonResponse({ error: "Failed to promote waitlisted invitations." }, 500);
    }

    const promotedInvitations = Array.isArray(promotedRows) ? promotedRows : [];
    const promotedInvitationIds: string[] = [];
    const auditEntries: Array<{
      actor_type: "system" | "organizer";
      actor_id: string | null;
      action: string;
      entity_type: string;
      entity_id: string;
      new_value: Record<string, unknown>;
    }> = [];

    for (const row of promotedInvitations) {
      const { data: invitation, error: invitationError } = await serviceClient
        .from("invitations")
        .select("id, event_id, guest_id")
        .eq("id", row.id)
        .maybeSingle();

      if (invitationError || !invitation) {
        console.error("Error fetching promoted invitation details:", invitationError?.message ?? "unknown");
        return jsonResponse({ error: "Failed to load promoted invitation details." }, 500);
      }

      const { data: guest, error: guestError } = await serviceClient
        .from("guests")
        .select("email")
        .eq("id", invitation.guest_id)
        .maybeSingle();

      if (guestError || !guest) {
        console.error("Error fetching promoted invitation guest:", guestError?.message ?? "Guest not found.");
        return jsonResponse({ error: "Failed to load promoted invitation guest." }, 500);
      }

      promotedInvitationIds.push(invitation.id);

      const guestEmail = guest.email;

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
        actor_type: isServiceRoleRequest ? "system" : "organizer",
        actor_id: actorId,
        action: "waitlist.promoted",
        entity_type: "invitation",
        entity_id: invitation.id,
        new_value: {
          event_id: invitation.event_id,
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
      promoted_invitation_ids: promotedInvitationIds,
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

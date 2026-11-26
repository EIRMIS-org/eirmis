import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { resolveResendFrom, resolveResendTo } from "../_shared/resend.ts";
import {
  createHeadcountDecisionHandler,
  type HeadcountDecisionRpcResult,
} from "./handler.ts";

// ---------------------------------------------------------------------------
// Edge Function Entrypoint
// ---------------------------------------------------------------------------

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");

  let serviceClient: ReturnType<typeof createClient> | null = null;
  const getServiceClient = () => {
    if (!serviceClient) {
      serviceClient = createClient(supabaseUrl!, supabaseServiceRoleKey!);
    }
    return serviceClient;
  };

  const handler = createHeadcountDecisionHandler({
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    resendApiKey,
    resendFromEmail,

    async getAuthUser(authorization) {
      const authClient = createClient(supabaseUrl!, supabaseAnonKey!, {
        global: { headers: { Authorization: authorization } },
      });
      const {
        data: { user },
        error,
      } = await authClient.auth.getUser();
      return { userId: user?.id ?? null, error };
    },

    async decideHeadcountRequest({ requestId, decision, actorId, reason }) {
      const { data, error } = await getServiceClient().rpc(
        "decide_headcount_request",
        {
          p_request_id: requestId,
          p_decision: decision,
          p_actor_id: actorId,
          p_reason: reason,
        },
      );
      return {
        data: (data as HeadcountDecisionRpcResult | null) ?? null,
        error,
      };
    },

    async notifyGuestDecision({
      request,
      decision,
      oldMaxPartySize,
      newMaxPartySize,
      reason,
    }) {
      const client = getServiceClient();

      const { data: invitation, error: invitationError } = await client
        .from("invitations")
        .select("id, event_id, guest_id")
        .eq("id", request.invitation_id)
        .maybeSingle();

      if (invitationError || !invitation) {
        console.error(
          "Failed to fetch invitation for headcount notification:",
          invitationError?.message,
        );
        return;
      }

      const { data: event, error: eventError } = await client
        .from("events")
        .select("id, title")
        .eq("id", invitation.event_id)
        .maybeSingle();

      if (eventError || !event) {
        console.error(
          "Failed to fetch event for headcount notification:",
          eventError?.message,
        );
        return;
      }

      const { data: guest, error: guestError } = await client
        .from("guests")
        .select("email, full_name")
        .eq("id", invitation.guest_id)
        .maybeSingle();

      if (guestError || !guest) {
        console.error(
          "Failed to fetch guest for notification:",
          guestError?.message,
        );
        return;
      }

      const { data: emailLog, error: logError } = await client
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
        return;
      }

      const isApproval = decision === "approve";
      const subject = isApproval
        ? `Your headcount request for ${event.title} has been approved`
        : `Your headcount request for ${event.title} has been declined`;

      const textLines = isApproval
        ? [
            `Hi ${guest.full_name},`,
            `Your request for ${request.requested_additional_heads} additional guest(s) at ${event.title} has been approved.`,
            `Your party size has been increased from ${oldMaxPartySize} to ${newMaxPartySize}.`,
            reason ? `Organizer's note: ${reason}` : null,
          ]
        : [
            `Hi ${guest.full_name},`,
            `Your request for ${request.requested_additional_heads} additional guest(s) at ${event.title} has been declined.`,
            reason ? `Reason: ${reason}` : null,
          ];

      const markEmailFailed = async (failureReason: string) => {
        const { error: updateError } = await client
          .from("email_logs")
          .update({ status: "failed" })
          .eq("id", emailLog.id);

        if (updateError) {
          console.error(
            "Failed to mark email log as failed:",
            updateError.message,
          );
        }
        console.error(
          "Failed to send headcount decision notification:",
          failureReason,
        );
      };

      const fromAddress = resolveResendFrom(resendFromEmail!);
      let resendResponse: Response;
      try {
        resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey!}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [resolveResendTo(guest.email, fromAddress)],
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
        return;
      }

      let resendBody: unknown;
      try {
        resendBody = await resendResponse.json();
      } catch {
        await markEmailFailed(
          `Resend returned an invalid response (${resendResponse.status}).`,
        );
        return;
      }

      if (!resendResponse.ok) {
        await markEmailFailed(
          `Resend request failed (${resendResponse.status}): ${JSON.stringify(resendBody)}`,
        );
        return;
      }

      if (
        resendBody === null ||
        typeof resendBody !== "object" ||
        !("id" in resendBody) ||
        typeof resendBody.id !== "string"
      ) {
        await markEmailFailed("Resend response did not include a message ID.");
        return;
      }

      const { error: sentLogError } = await client
        .from("email_logs")
        .update({
          status: "sent",
          provider_message_id: resendBody.id,
          sent_at: new Date().toISOString(),
        })
        .eq("id", emailLog.id);

      if (sentLogError) {
        console.error(
          "Email sent but failed to update email log:",
          sentLogError.message,
        );
      }
    },
  });

  return handler(req);
});

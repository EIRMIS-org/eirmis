import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { resolveResendFrom, resolveResendTo } from "../_shared/resend.ts";
import {
  createScanCallbackHandler,
  type InvitationDesignRow,
} from "./handler.ts";

// ---------------------------------------------------------------------------
// Edge Function Entrypoint
// ---------------------------------------------------------------------------

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const scannerWebhookSecret = Deno.env.get("SCANNER_WEBHOOK_SECRET");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const storageBucket = Deno.env.get("STORAGE_BUCKET_DESIGNS") || "invitations";

  let serviceClient: ReturnType<typeof createClient> | null = null;
  const getServiceClient = () => {
    if (!serviceClient) {
      serviceClient = createClient(supabaseUrl!, supabaseServiceRoleKey!);
    }
    return serviceClient;
  };

  const handler = createScanCallbackHandler({
    supabaseUrl,
    supabaseServiceRoleKey,
    scannerWebhookSecret,

    async findPendingDesign(eventId) {
      let designQuery = getServiceClient()
        .from("invitation_designs")
        .select("id, event_id, design_type, html_storage_path, validation_status")
        .eq("design_type", "html");

      if (eventId) {
        designQuery = designQuery.eq("event_id", eventId);
      }

      const { data, error } = await designQuery
        .eq("validation_status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return { data: (data as InvitationDesignRow | null) ?? null, error };
    },

    async findDesignByEventId(eventId) {
      const { data, error } = await getServiceClient()
        .from("invitation_designs")
        .select("id, event_id, design_type, html_storage_path, validation_status")
        .eq("event_id", eventId)
        .eq("design_type", "html")
        .maybeSingle();

      return { data: (data as InvitationDesignRow | null) ?? null, error };
    },

    async moveToQuarantine(originalPath, quarantinedPath) {
      const { error } = await getServiceClient()
        .storage.from(storageBucket)
        .move(originalPath, quarantinedPath);
      return { error };
    },

    async updateDesign(id, update) {
      const { error } = await getServiceClient()
        .from("invitation_designs")
        .update(update)
        .eq("id", id);
      return { error };
    },

    async insertAuditLog(entry) {
      const { error } = await getServiceClient()
        .from("audit_log_entries")
        .insert(entry);
      return { error };
    },

    async notifyScanFailure({ eventId, scanId, validationNotes }) {
      if (!resendApiKey || !resendFromEmail) {
        return;
      }

      const client = getServiceClient();
      const { data: event, error: eventError } = await client
        .from("events")
        .select("id, title, organizer_id")
        .eq("id", eventId)
        .maybeSingle();

      if (eventError || !event) {
        return;
      }

      const { data: organizer, error: orgError } = await client
        .from("organizer_profiles")
        .select("email, full_name")
        .eq("id", event.organizer_id)
        .maybeSingle();

      if (orgError || !organizer?.email) {
        return;
      }

      const { data: emailLog, error: logError } = await client
        .from("email_logs")
        .insert({
          event_id: event.id,
          recipient_email: organizer.email,
          type: "invitation_design_validation_failed",
          status: "queued",
        })
        .select("id")
        .single();

      if (logError) {
        console.error("Failed to insert queued email_log:", logError.message);
      }

      const emailLogId = emailLog?.id;
      const subject = `Security scan failed for invitation design: ${event.title}`;
      const organizerGreeting = organizer.full_name
        ? `Hi ${organizer.full_name},`
        : "Hello,";
      const emailBodyText = [
        organizerGreeting,
        `The HTML invitation design uploaded for '${event.title}' failed security and malware scanning.`,
        `Scan ID: ${scanId}`,
        validationNotes ? `Reason / Detected issues:\n${validationNotes}` : null,
        "The uploaded design has been isolated and will not be displayed to guests. Please review your HTML file and upload a clean version.",
      ]
        .filter((line): line is string => line !== null)
        .join("\n\n");

      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resolveResendFrom(resendFromEmail),
            to: [resolveResendTo(organizer.email, resolveResendFrom(resendFromEmail))],
            subject,
            text: emailBodyText,
          }),
        });

        const resendData = (await resendResponse.json()) as { id?: string } | null;

        if (resendResponse.ok && resendData?.id && emailLogId) {
          await client
            .from("email_logs")
            .update({
              status: "sent",
              provider_message_id: resendData.id,
              sent_at: new Date().toISOString(),
            })
            .eq("id", emailLogId);
        } else if (emailLogId) {
          await client
            .from("email_logs")
            .update({ status: "failed" })
            .eq("id", emailLogId);
        }
      } catch (mailErr) {
        console.error("Failed to dispatch scan failure email via Resend:", mailErr);
        if (emailLogId) {
          await client
            .from("email_logs")
            .update({ status: "failed" })
            .eq("id", emailLogId);
        }
      }
    },
  });

  return handler(req);
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { resolveResendFrom, resolveResendTo } from "../../_shared/resend.ts";
import {
  processPromotedInvitations,
  type PromotedInvitationRow,
} from "./post-promotion.ts";

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

    const { data: promotedRows, error: promoteError } = await serviceClient.rpc(
      "promote_waitlist_fifo",
      {
        p_event_id: eventId,
        p_max_promotions: maxPromotions,
      },
    );

    if (promoteError) {
      if (
        promoteError.code === "P0002" ||
        promoteError.message?.includes("EVENT_NOT_FOUND")
      ) {
        return jsonResponse({ error: "Event not found." }, 404);
      }
      console.error("Failed to promote waitlisted invitations:", promoteError.message);
      return jsonResponse({ error: "Failed to promote waitlisted invitations." }, 500);
    }

    const promotedInvitations: PromotedInvitationRow[] = Array.isArray(promotedRows)
      ? promotedRows
      : [];

    const summary = await processPromotedInvitations(promotedInvitations, {
      actorType: isServiceRoleRequest ? "system" : "organizer",
      actorId,

      async fetchGuestEmail(guestId) {
        const { data: guest, error } = await serviceClient
          .from("guests")
          .select("email")
          .eq("id", guestId)
          .maybeSingle();

        if (error) {
          return { email: null, error };
        }
        return { email: guest?.email ?? null, error: null };
      },

      async sendPromotionEmail(guestEmail) {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resolveResendFrom(resendFromEmail),
            to: [resolveResendTo(guestEmail, resolveResendFrom(resendFromEmail))],
            subject: "You have been promoted from the waitlist",
            text: "A spot opened up for the event and your invitation has been promoted from the waitlist.",
          }),
        });

        const emailResult = await emailResponse.json().catch(() => null);
        if (!emailResponse.ok || typeof emailResult?.id !== "string") {
          throw new Error(`Resend returned non-OK response: ${emailResponse.status}`);
        }

        return { providerMessageId: emailResult.id };
      },

      async insertEmailLog(entry) {
        const { error } = await serviceClient.from("email_logs").insert(entry);
        return { error };
      },

      async insertAuditLog(entry) {
        const { error } = await serviceClient.from("audit_log_entries").insert(entry);
        return { error };
      },
    });

    return jsonResponse(summary, 200);
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

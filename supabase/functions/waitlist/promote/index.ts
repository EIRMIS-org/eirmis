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
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
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

  if (
    typeof maxPromote !== "number" ||
    !Number.isInteger(maxPromote) ||
    maxPromote < 1
  ) {
    return jsonResponse({ error: "max_promote must be a positive integer." }, 400);
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  const isServiceRoleRequest = authorization === `Bearer ${supabaseServiceRoleKey}` || authorization === supabaseServiceRoleKey;

  if (!isServiceRoleRequest) {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    try {
      const isOrganizer = await ensureOrganizerForEvent(
        serviceClient,
        user.id,
        requestBody.event_id as string,
      );

      if (!isOrganizer) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
    } catch (error) {
      console.error("Error verifying organizer access:", error);
      return jsonResponse({ error: "Failed to verify organizer access." }, 500);
    }
  }

  return jsonResponse({
    ok: true,
    event_id: requestBody.event_id,
    max_promote: maxPromote,
    caller: isServiceRoleRequest ? "service-role-worker" : "organizer",
  });
});

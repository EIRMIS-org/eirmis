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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Check-in function is missing required configuration.");
    return jsonResponse({ error: "Function is not configured." }, 500);
  }
  if (!authorization) return jsonResponse({ error: "Unauthorized" }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }
  if (body === null || typeof body !== "object" || !("qr_token" in body) ||
    typeof body.qr_token !== "string" || !body.qr_token.trim()) {
    return jsonResponse({ error: "qr_token is required." }, 400);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: attendee, error: attendeeError } = await serviceClient
    .from("attendees")
    .select("*, invitations!inner(event_id)")
    .eq("qr_token", body.qr_token)
    .maybeSingle();
  if (attendeeError) {
    console.error("Failed to resolve QR token:", attendeeError.message);
    return jsonResponse({ error: "Failed to resolve QR token." }, 500);
  }
  if (!attendee) return jsonResponse({ result: "invalid_token", attendee: null, checked_in_at: null, message: "Invalid QR token." }, 200);

  const eventId = attendee.invitations.event_id;
  const { data: organizer } = await serviceClient.from("events").select("organizer_id").eq("id", eventId).eq("organizer_id", user.id).maybeSingle();
  const { data: assignment } = await serviceClient.from("checkin_assignments").select("id").eq("event_id", eventId).eq("staff_user_id", user.id).eq("status", "active").maybeSingle();
  if (!organizer && !assignment) return jsonResponse({ error: "Forbidden" }, 403);

  const now = new Date().toISOString();
  if (attendee.checked_in) {
    await serviceClient.from("audit_log_entries").insert({
      actor_type: assignment ? "check_in_staff" : "organizer",
      actor_id: assignment?.id ?? user.id,
      action: "checkin.attendee_rescanned",
      entity_type: "attendee",
      entity_id: attendee.id,
      new_value: { checked_in_at: attendee.checked_in_at },
    });
    return jsonResponse({ result: "already_checked_in", attendee, checked_in_at: attendee.checked_in_at, message: "This attendee was already checked in." });
  }

  const { data: updated, error: updateError } = await serviceClient
    .from("attendees")
    .update({ checked_in: true, checked_in_at: now, checked_in_by: user.id })
    .eq("id", attendee.id)
    .eq("checked_in", false)
    .select("*, invitations!inner(event_id)")
    .maybeSingle();
  if (updateError || !updated) {
    console.error("Failed to record check-in:", updateError?.message ?? "No attendee updated.");
    return jsonResponse({ error: "Failed to record check-in." }, 500);
  }

  await serviceClient.from("audit_log_entries").insert({
    actor_type: assignment ? "check_in_staff" : "organizer",
    actor_id: assignment?.id ?? user.id,
    action: "checkin.attendee_scanned",
    entity_type: "attendee",
    entity_id: updated.id,
    new_value: { checked_in_at: now },
  });

  const realtimeKey = Deno.env.get("SUPABASE_ANON_KEY");
  try {
    const broadcastResponse = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: realtimeKey ?? "", Authorization: `Bearer ${realtimeKey ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ topic: `broadcast.attendance.${eventId}`, event: "check-in", payload: { attendee_name: updated.full_name, scanned_at: now, checked_in_by: user.id } }],
      }),
    });
    if (!broadcastResponse.ok) console.error("Attendance broadcast failed:", broadcastResponse.status);
  } catch (error) {
    console.error("Attendance broadcast request failed:", error);
  }

  return jsonResponse({ result: "accepted", attendee: updated, checked_in_at: now, message: null });
});

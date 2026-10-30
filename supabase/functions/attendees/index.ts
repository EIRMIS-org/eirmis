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
  const attendeeId = new URL(req.url).pathname.match(
    /\/attendees\/([^/]+)\/decision\/?$/,
  )?.[1];

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error("Attendee decision function is missing required configuration.");
    return jsonResponse({ error: "Function is not configured." }, 500);
  }

  if (!authorization) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (
    !attendeeId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(attendeeId)
  ) {
    return jsonResponse({ error: "A valid attendee ID is required." }, 400);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  if (
    body === null ||
    typeof body !== "object" ||
    !("decision" in body) ||
    (body.decision !== "approve" && body.decision !== "reject")
  ) {
    return jsonResponse(
      { error: "decision must be either approve or reject." },
      400,
    );
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
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

  if (!organizer) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const { data: attendee, error: attendeeError } = await serviceClient
    .from("attendees")
    .select("id, invitation_id, status")
    .eq("id", attendeeId)
    .maybeSingle();

  if (attendeeError) {
    console.error("Failed to fetch attendee:", attendeeError.message);
    return jsonResponse({ error: "Failed to fetch attendee." }, 500);
  }

  if (!attendee) {
    return jsonResponse({ error: "Attendee not found." }, 404);
  }

  const { data: invitation, error: invitationError } = await serviceClient
    .from("invitations")
    .select("event_id")
    .eq("id", attendee.invitation_id)
    .maybeSingle();

  if (invitationError) {
    console.error("Failed to fetch attendee invitation:", invitationError.message);
    return jsonResponse({ error: "Failed to fetch attendee invitation." }, 500);
  }

  const { data: event, error: eventError } = invitation
    ? await serviceClient
      .from("events")
      .select("organizer_id")
      .eq("id", invitation.event_id)
      .maybeSingle()
    : { data: null, error: null };

  if (eventError) {
    console.error("Failed to fetch attendee event:", eventError.message);
    return jsonResponse({ error: "Failed to fetch attendee event." }, 500);
  }

  if (!event || event.organizer_id !== user.id) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  if (attendee.status !== "pending") {
    return jsonResponse({ error: "Attendee is not pending." }, 409);
  }

  const status = body.decision === "approve" ? "approved" : "rejected";
  const { data: updatedAttendee, error: updateError } = await serviceClient
    .from("attendees")
    .update({ status })
    .eq("id", attendee.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error("Failed to update attendee decision:", updateError.message);
    return jsonResponse({ error: "Failed to update attendee decision." }, 500);
  }

  if (!updatedAttendee) {
    return jsonResponse({ error: "Attendee is no longer pending." }, 409);
  }

  if (status === "approved") {
    const { count: pendingCount, error: pendingError } = await serviceClient
      .from("attendees")
      .select("id", { count: "exact", head: true })
      .eq("invitation_id", attendee.invitation_id)
      .eq("status", "pending");

    if (pendingError) {
      console.error("Failed to count pending attendees:", pendingError.message);
      return jsonResponse({
        error: "Decision saved, but failed to check remaining attendees.",
        attendee: updatedAttendee,
      }, 500);
    }

    if (pendingCount === 0) {
      try {
        const qrBundleResponse = await fetch(
          `${supabaseUrl.replace(/\/$/, "")}/functions/v1/qr-bundle`,
          {
            method: "POST",
            headers: {
              Authorization: authorization,
              apikey: supabaseAnonKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ invitation_id: attendee.invitation_id }),
          },
        );

        if (!qrBundleResponse.ok) {
          const responseBody = await qrBundleResponse.text();
          console.error(
            `QR bundle request failed (${qrBundleResponse.status}):`,
            responseBody,
          );
          return jsonResponse({
            error: "Decision saved, but the QR bundle request failed.",
            attendee: updatedAttendee,
          }, 502);
        }
      } catch (error) {
        console.error("Failed to request QR bundle:", error);
        return jsonResponse({
          error: "Decision saved, but the QR bundle request failed.",
          attendee: updatedAttendee,
        }, 502);
      }
    }
  }

  return jsonResponse({ attendee: updatedAttendee });
});

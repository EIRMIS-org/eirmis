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

type AttendeeRecord = {
  id: string;
  invitation_id: string;
  status: string;
  [key: string]: unknown;
};

type DecisionRpcResult = {
  attendee: AttendeeRecord;
  capacity_warning: boolean;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function createQrToken(
  secret: string,
  attendeeId: string,
  eventId: string,
  invitationId: string,
) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const payload = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify({
      attendee_id: attendeeId,
      event_id: eventId,
      invitation_id: invitationId,
      iat: now,
      exp: now + 60 * 60 * 24 * 365,
    })),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${encodeBase64Url(new Uint8Array(signature))}`;
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
  const qrSigningSecret = Deno.env.get("QR_SIGNING_SECRET");
  const authorization = req.headers.get("Authorization");
  const attendeeId = new URL(req.url).pathname.match(
    /\/attendees\/([^/]+)\/decision\/?$/,
  )?.[1];

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !qrSigningSecret) {
    console.error("Attendee decision function is missing required configuration.");
    return jsonResponse({ error: "Function is not configured." }, 500);
  }
  if (!authorization) return jsonResponse({ error: "Unauthorized" }, 401);
  if (!attendeeId || !uuidPattern.test(attendeeId)) {
    return jsonResponse({ error: "A valid attendee ID is required." }, 400);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }
  if (!isRecord(body)) {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const decision = body.decision;
  if (decision !== "approve" && decision !== "reject") {
    return jsonResponse(
      { error: "decision must be either approve or reject." },
      400,
    );
  }

  const rawReason = body.reason;
  if (
    rawReason !== undefined &&
    rawReason !== null &&
    typeof rawReason !== "string"
  ) {
    return jsonResponse({ error: "reason must be a string or null." }, 400);
  }
  const reason = typeof rawReason === "string" ? rawReason.trim() || null : null;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
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

  const { data: target, error: targetError } = await serviceClient
    .from("attendees")
    .select("id, invitation_id, status, invitations!inner(event_id, events!inner(id, organizer_id))")
    .eq("id", attendeeId)
    .maybeSingle();
  if (targetError) {
    console.error("Failed to fetch attendee:", targetError.message);
    return jsonResponse({ error: "Failed to fetch attendee." }, 500);
  }
  if (!target) return jsonResponse({ error: "Attendee not found." }, 404);

  const invitation = Array.isArray(target.invitations)
    ? target.invitations[0]
    : target.invitations;
  const event = invitation && (Array.isArray(invitation.events)
    ? invitation.events[0]
    : invitation.events);
  if (!event || event.organizer_id !== user.id) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  if (target.status !== "pending") {
    return jsonResponse({ error: "Attendee is not pending." }, 409);
  }

  const qrToken = decision === "approve"
    ? await createQrToken(
      qrSigningSecret,
      attendeeId,
      event.id,
      target.invitation_id,
    )
    : null;
  const { data: result, error: decisionError } = await serviceClient.rpc(
    "decide_attendee",
    {
      p_attendee_id: attendeeId,
      p_decision: decision,
      p_actor_id: user.id,
      p_override_capacity: decision === "approve",
      p_reason: reason ?? (decision === "approve" ? "Approved by organizer" : null),
    },
  );
  if (decisionError) {
    if (decisionError.message.includes("EVENT_CAPACITY_EXCEEDED")) {
      return jsonResponse({ error: "Event capacity exceeded." }, 409);
    }
    if (decisionError.message.includes("ATTENDEE_NOT_PENDING")) {
      return jsonResponse({ error: "Attendee is no longer pending." }, 409);
    }
    if (decisionError.message.includes("ATTENDEE_NOT_FOUND")) {
      return jsonResponse({ error: "Attendee not found." }, 404);
    }
    console.error("Failed to record attendee decision:", decisionError.message);
    return jsonResponse({ error: "Failed to record attendee decision." }, 500);
  }

  const row = result as DecisionRpcResult;
  if (!row?.attendee) {
    console.error("Attendee decision returned no updated attendee.");
    return jsonResponse({ error: "Failed to record attendee decision." }, 500);
  }

  if (qrToken) {
    const { data: updatedAttendee, error: tokenError } = await serviceClient
      .from("attendees")
      .update({ qr_token: qrToken })
      .eq("id", attendeeId)
      .eq("status", "approved")
      .select("*")
      .single();
    if (tokenError || !updatedAttendee) {
      console.error(
        "Attendee approved, but QR token persistence failed:",
        tokenError?.message ?? "No attendee row returned.",
      );
      return jsonResponse({
        error: "Attendee approved, but QR token could not be issued.",
        attendee: row.attendee,
        capacity_warning: row.capacity_warning,
      }, 500);
    }
    row.attendee = updatedAttendee;
  }

  const { count: pendingCount, error: pendingError } = await serviceClient
    .from("attendees")
    .select("id", { count: "exact", head: true })
    .eq("invitation_id", target.invitation_id)
    .eq("status", "pending");
  if (pendingError) {
    console.error("Failed to count pending attendees:", pendingError.message);
    return jsonResponse({
      error: "Decision saved, but failed to check remaining attendees.",
      attendee: row.attendee,
      capacity_warning: row.capacity_warning,
    }, 500);
  }

  if (pendingCount === 0) {
    const { data: notificationContext, error: notificationContextError } =
      await serviceClient
        .from("invitations")
        .select("event_id, guests!inner(email)")
        .eq("id", target.invitation_id)
        .single();
    if (notificationContextError || !notificationContext) {
      console.error(
        "Failed to fetch attendee notification recipient:",
        notificationContextError?.message ?? "No invitation returned.",
      );
      return jsonResponse({
        error: "Decision saved, but notification could not be queued.",
        attendee: row.attendee,
        capacity_warning: row.capacity_warning,
      }, 500);
    }

    const guest = Array.isArray(notificationContext.guests)
      ? notificationContext.guests[0]
      : notificationContext.guests;
    const { error: notificationError } = await serviceClient
      .from("email_logs")
      .insert({
        event_id: notificationContext.event_id,
        invitation_id: target.invitation_id,
        recipient_email: guest.email,
        type: "attendee_status_update",
        status: "queued",
      });
    if (notificationError) {
      console.error(
        "Failed to queue attendee status notification:",
        notificationError.message,
      );
      return jsonResponse({
        error: "Decision saved, but notification could not be queued.",
        attendee: row.attendee,
        capacity_warning: row.capacity_warning,
      }, 500);
    }

    try {
      const qrBundleResponse = await fetch(
        `${supabaseUrl.replace(/\/$/, "")}/functions/v1/qr-bundle`,
        {
          method: "POST",
          headers: {
            Authorization: authorization,
            apikey: anonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ invitation_id: target.invitation_id }),
        },
      );
      if (!qrBundleResponse.ok) {
        console.error(
          `QR bundle request failed (${qrBundleResponse.status}):`,
          await qrBundleResponse.text(),
        );
        return jsonResponse({
          error: "Decision saved, but the QR bundle request failed.",
          attendee: row.attendee,
          capacity_warning: row.capacity_warning,
        }, 502);
      }
    } catch (error) {
      console.error("Failed to request QR bundle:", error);
      return jsonResponse({
        error: "Decision saved, but the QR bundle request failed.",
        attendee: row.attendee,
        capacity_warning: row.capacity_warning,
      }, 502);
    }
  }

  return jsonResponse({
    attendee: row.attendee,
    capacity_warning: row.capacity_warning,
  });
});

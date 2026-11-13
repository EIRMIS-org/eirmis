
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

  // --------------------------------------------------------------------------
  // 1. Validate environment configuration.
  // --------------------------------------------------------------------------

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error(
      "Attendee decision function is missing required configuration.",
    );
    return jsonResponse({ error: "Function is not configured." }, 500);
  }

  // --------------------------------------------------------------------------
  // 2. Validate authorization header and attendee ID.
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // 3. Parse and validate the request body.
  // --------------------------------------------------------------------------

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const requestBody = body as Record<string, unknown>;

  const decision = requestBody.decision;

  if (decision !== "approve" && decision !== "reject") {
    return jsonResponse(
      { error: "decision must be either approve or reject." },
      400,
    );
  }

  // Capacity override is optional and defaults to false.
  const overrideCapacity =
    requestBody.override_capacity === undefined
      ? false
      : requestBody.override_capacity;

  if (typeof overrideCapacity !== "boolean") {
    return jsonResponse(
      { error: "override_capacity must be a boolean." },
      400,
    );
  }

  // Validate the optional reason.
  const rawReason = requestBody.reason;

  if (
    rawReason !== undefined &&
    rawReason !== null &&
    typeof rawReason !== "string"
  ) {
    return jsonResponse(
      { error: "reason must be a string or null." },
      400,
    );
  }

  const reason =
    typeof rawReason === "string"
      ? rawReason.trim() || null
      : null;

  // A capacity override only applies to approvals.
  if (overrideCapacity && decision !== "approve") {
    return jsonResponse(
      { error: "Capacity override is only allowed for approvals." },
      400,
    );
  }

  // Explicit capacity overrides require a meaningful reason.
  if (overrideCapacity && !reason) {
    return jsonResponse(
      { error: "A non-empty reason is required for a capacity override." },
      400,
    );
  }

  // --------------------------------------------------------------------------
  // 4. Authenticate the requesting user.
  // --------------------------------------------------------------------------

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // --------------------------------------------------------------------------
  // 5. Create the service-role client.
  //
  // The service-role client invokes the restricted PostgreSQL RPC.
  // --------------------------------------------------------------------------

  const serviceClient = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
  );

  // --------------------------------------------------------------------------
  // 6. Verify that the user is an active organizer.
  // --------------------------------------------------------------------------

  const { data: organizer, error: organizerError } = await serviceClient
    .from("organizer_profiles")
    .select("id")
    .eq("id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (organizerError) {
    console.error(
      "Failed to verify organizer:",
      organizerError.message,
    );
    return jsonResponse({ error: "Failed to verify organizer." }, 500);
  }

  if (!organizer) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  // --------------------------------------------------------------------------
  // 7. Retrieve the attendee and verify that it exists.
  // --------------------------------------------------------------------------

  const { data: attendee, error: attendeeError } = await serviceClient
    .from("attendees")
    .select("id, invitation_id, status")
    .eq("id", attendeeId)
    .maybeSingle();

  if (attendeeError) {
    console.error(
      "Failed to fetch attendee:",
      attendeeError.message,
    );
    return jsonResponse({ error: "Failed to fetch attendee." }, 500);
  }

  if (!attendee) {
    return jsonResponse({ error: "Attendee not found." }, 404);
  }

  // --------------------------------------------------------------------------
  // 8. Retrieve the associated invitation.
  // --------------------------------------------------------------------------

  const { data: invitation, error: invitationError } = await serviceClient
    .from("invitations")
    .select("event_id")
    .eq("id", attendee.invitation_id)
    .maybeSingle();

  if (invitationError) {
    console.error(
      "Failed to fetch attendee invitation:",
      invitationError.message,
    );
    return jsonResponse(
      { error: "Failed to fetch attendee invitation." },
      500,
    );
  }

  if (!invitation) {
    return jsonResponse({ error: "Invitation not found." }, 404);
  }

  // --------------------------------------------------------------------------
  // 9. Verify that the organizer owns the event.
  // --------------------------------------------------------------------------

  const { data: event, error: eventError } = await serviceClient
    .from("events")
    .select("organizer_id")
    .eq("id", invitation.event_id)
    .maybeSingle();

  if (eventError) {
    console.error(
      "Failed to fetch attendee event:",
      eventError.message,
    );
    return jsonResponse({ error: "Failed to fetch attendee event." }, 500);
  }

  if (!event || event.organizer_id !== user.id) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  // Preliminary check for a better response.
  // The PostgreSQL RPC performs the authoritative check again
  // while holding the event and attendee locks.
  if (attendee.status !== "pending") {
    return jsonResponse({ error: "Attendee is not pending." }, 409);
  }

  // --------------------------------------------------------------------------
  // 10. Call the transactional PostgreSQL operation.
  //
  // This replaces the previous direct attendees.update() operation.
  //
  // The RPC handles:
  //   - Event row locking.
  //   - Capacity calculation.
  //   - Approval/rejection.
  //   - Explicit capacity override.
  //   - Audit logging.
  //   - Returning the capacity_warning result.
  // --------------------------------------------------------------------------

  const { data: decisionData, error: decisionError } =
    await serviceClient.rpc("decide_attendee", {
      p_attendee_id: attendee.id,
      p_decision: decision,
      p_actor_id: user.id,
      p_override_capacity: overrideCapacity,
      p_reason: reason,
    });

  if (decisionError) {
    console.error(
      "Failed to process attendee decision:",
      decisionError.message,
      decisionError.code,
    );

    const errorMessage = decisionError.message || "";
    const errorCode = decisionError.code || "";

    if (errorMessage.includes("EVENT_CAPACITY_EXCEEDED")) {
      return jsonResponse(
        {
          error:
            "Event capacity has been reached. An explicit organizer override is required.",
        },
        409,
      );
    }

    if (errorMessage.includes("ATTENDEE_NOT_PENDING")) {
      return jsonResponse(
        { error: "Attendee is no longer pending." },
        409,
      );
    }

    if (
      errorMessage.includes("ATTENDEE_NOT_FOUND") ||
      errorMessage.includes("INVITATION_NOT_FOUND") ||
      errorMessage.includes("EVENT_NOT_FOUND") ||
      errorCode === "P0002"
    ) {
      return jsonResponse({ error: "Attendee or associated record not found." }, 404);
    }

    if (
      errorMessage.includes("ORGANIZER_NOT_AUTHORIZED") ||
      errorCode === "42501"
    ) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    if (errorCode === "22023") {
      return jsonResponse({ error: errorMessage }, 400);
    }

    return jsonResponse(
      { error: "Failed to process attendee decision." },
      500,
    );
  }

  // --------------------------------------------------------------------------
  // 11. Validate the RPC response.
  // --------------------------------------------------------------------------

  const decisionResult = decisionData as DecisionRpcResult | null;

  if (
    !decisionResult ||
    !decisionResult.attendee ||
    typeof decisionResult.capacity_warning !== "boolean"
  ) {
    console.error("The attendee decision RPC returned an invalid response.");
    return jsonResponse(
      { error: "Invalid response from attendee decision operation." },
      500,
    );
  }

  const updatedAttendee = decisionResult.attendee;

  const capacityWarning = decisionResult.capacity_warning;

  // --------------------------------------------------------------------------
  // 12. Preserve the existing QR-bundle behavior.
  //
  // When an attendee is approved and no pending attendees remain,
  // request the QR bundle for the entire invitation.
  // --------------------------------------------------------------------------

  if (decision === "approve") {
    const { count: pendingCount, error: pendingError } = await serviceClient
      .from("attendees")
      .select("id", { count: "exact", head: true })
      .eq("invitation_id", updatedAttendee.invitation_id)
      .eq("status", "pending");

    if (pendingError) {
      console.error(
        "Failed to count pending attendees:",
        pendingError.message,
      );

      return jsonResponse(
        {
          error: "Decision saved, but failed to check remaining attendees.",
          attendee: updatedAttendee,
          capacity_warning: capacityWarning,
        },
        500,
      );
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
            body: JSON.stringify({
              invitation_id: updatedAttendee.invitation_id,
            }),
          },
        );

        if (!qrBundleResponse.ok) {
          const responseBody = await qrBundleResponse.text();

          console.error(
            `QR bundle request failed (${qrBundleResponse.status}):`,
            responseBody,
          );

          return jsonResponse(
            {
              error: "Decision saved, but the QR bundle request failed.",
              attendee: updatedAttendee,
              capacity_warning: capacityWarning,
            },
            502,
          );
        }
      } catch (error) {
        console.error("Failed to request QR bundle:", error);

        return jsonResponse(
          {
            error: "Decision saved, but the QR bundle request failed.",
            attendee: updatedAttendee,
            capacity_warning: capacityWarning,
          },
          502,
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // 13. Return the response defined by the OpenAPI contract.
  // --------------------------------------------------------------------------

  return jsonResponse({
    attendee: updatedAttendee,
    capacity_warning: capacityWarning,
  });
});

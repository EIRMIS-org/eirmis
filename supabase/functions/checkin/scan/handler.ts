import { verifyQrToken, type QrTokenClaims } from "../../_shared/qr-token.ts";

export interface ScanAttendee {
  id: string;
  invitation_id: string;
  full_name: string;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  [key: string]: unknown;
}

export interface ScanActor {
  actorType: "organizer" | "check_in_staff";
  actorId: string;
}

export interface ScanDependencies {
  signingSecret: string;
  now: () => Date;
  authenticate: (authorization: string) => Promise<string | null>;
  resolveAttendee: (claims: QrTokenClaims, token: string) => Promise<ScanAttendee | null>;
  authorize: (userId: string, eventId: string, now: Date) => Promise<ScanActor | null>;
  recordCheckIn: (input: {
    attendeeId: string;
    eventId: string;
    authUserId: string;
    actor: ScanActor;
  }) => Promise<{
    result: "accepted" | "already_checked_in";
    attendee: ScanAttendee;
    checkedInAt: string;
    totalCheckedIn: number;
  }>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(status: number, code: string, message: string): Response {
  return json({ code, message, details: null, hint: null }, status);
}

export function createScanHandler(dependencies: ScanDependencies) {
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname;
    if (path !== "/checkin/scan" && path !== "/functions/v1/checkin/scan") {
      return error(404, "NOT_FOUND", "Unknown check-in route.");
    }
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST") return error(405, "METHOD_NOT_ALLOWED", "Method not allowed.");

    const authorization = request.headers.get("Authorization");
    if (!authorization) return error(401, "UNAUTHORIZED", "A valid JWT is required.");
    const userId = await dependencies.authenticate(authorization);
    if (!userId) return error(401, "UNAUTHORIZED", "A valid JWT is required.");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return error(400, "INVALID_REQUEST", "Request body must be valid JSON.");
    }
    if (body === null || typeof body !== "object" ||
      typeof (body as Record<string, unknown>).qr_token !== "string" ||
      !(body as Record<string, string>).qr_token.trim()) {
      return error(400, "INVALID_REQUEST", "qr_token is required.");
    }

    const token = (body as Record<string, string>).qr_token.trim();
    let claims: QrTokenClaims;
    try {
      claims = await verifyQrToken(token, dependencies.signingSecret, { now: dependencies.now() });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "QR token validation failed.";
      return error(422, "INVALID_QR_TOKEN", message);
    }

    if ("event_id" in body) {
      if (typeof body.event_id !== "string") return error(400, "INVALID_REQUEST", "Expected an event ID.");
      if (body.event_id.toLowerCase() !== claims.event_id.toLowerCase()) {
        return error(422, "EVENT_MISMATCH", "QR token belongs to a different event.");
      }
    }

    const attendee = await dependencies.resolveAttendee(claims, token);
    if (!attendee || attendee.status !== "approved") {
      return json({ result: "invalid_token", attendee: null, checked_in_at: null, message: "Invalid QR token." });
    }

    const actor = await dependencies.authorize(userId, claims.event_id, dependencies.now());
    if (!actor) return error(403, "FORBIDDEN", "You are not authorized to check in attendees for this event.");

    const recorded = await dependencies.recordCheckIn({
      attendeeId: attendee.id,
      eventId: claims.event_id,
      authUserId: userId,
      actor,
    });
    return json({
      result: recorded.result,
      attendee: recorded.attendee,
      checked_in_at: recorded.checkedInAt,
      message: recorded.result === "already_checked_in" ? "This attendee was already checked in." : null,
    });
  };
}

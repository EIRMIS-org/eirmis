import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createScanHandler, type ScanActor, type ScanAttendee } from "./scan/handler.ts";
import type { QrTokenClaims } from "../_shared/qr-token.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const signingSecret = Deno.env.get("QR_SIGNING_SECRET") ?? "";

if (!supabaseUrl || !anonKey || !serviceRoleKey || !signingSecret) {
  throw new Error("Check-in function is missing required configuration.");
}

const serviceClient = createClient(supabaseUrl, serviceRoleKey);

function localDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(instant);
}

const handler = createScanHandler({
  signingSecret,
  now: () => new Date(),
  async authenticate(authorization) {
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error } = await authClient.auth.getUser();
    return error ? null : user?.id ?? null;
  },
  async resolveAttendee(claims: QrTokenClaims, token: string) {
    const { data, error } = await serviceClient.from("attendees")
      .select("*, invitations!inner(id,event_id)")
      .eq("id", claims.attendee_id).eq("invitation_id", claims.invitation_id)
      .eq("invitations.event_id", claims.event_id).eq("qr_token", token)
      .eq("status", "approved").maybeSingle();
    if (error) throw error;
    return data as ScanAttendee | null;
  },
  async authorize(userId: string, eventId: string, now: Date): Promise<ScanActor | null> {
    const { data: event, error: eventError } = await serviceClient.from("events")
      .select("organizer_id,starts_at,ends_at,event_timezone")
      .eq("id", eventId).is("deleted_at", null).maybeSingle();
    if (eventError) throw eventError;
    if (!event) return null;
    if (event.organizer_id === userId) return { actorType: "organizer", actorId: userId };

    const { data: assignment, error: assignmentError } = await serviceClient
      .from("checkin_assignments").select("id").eq("event_id", eventId)
      .eq("auth_user_id", userId).eq("status", "active").maybeSingle();
    if (assignmentError) throw assignmentError;
    if (!assignment) return null;

    const startsAt = new Date(event.starts_at);
    const endsAt = new Date(event.ends_at);
    const isInEventWindow = now >= startsAt && now <= endsAt;
    const isEventDate = localDate(now, event.event_timezone) === localDate(startsAt, event.event_timezone);
    return isInEventWindow || isEventDate
      ? { actorType: "check_in_staff", actorId: assignment.id }
      : null;
  },
  async recordCheckIn({ attendeeId, eventId, authUserId, actor }) {
    const { data, error } = await serviceClient.rpc("record_attendee_check_in", {
      p_attendee_id: attendeeId, p_event_id: eventId, p_auth_user_id: authUserId,
      p_actor_type: actor.actorType, p_actor_id: actor.actorId,
    });
    if (error) throw error;
    const result = data as {
      result: "accepted" | "already_checked_in"; attendee: ScanAttendee;
      checked_in_at: string; total_checked_in: number;
    };
    return {
      result: result.result, attendee: result.attendee,
      checkedInAt: result.checked_in_at, totalCheckedIn: result.total_checked_in,
    };
  },
});

serve(async (request) => {
  try {
    return await handler(request);
  } catch (cause) {
    console.error("Check-in scan failed:", cause);
    return new Response(JSON.stringify({
      code: "CHECKIN_FAILED", message: "Failed to process check-in.", details: null, hint: null,
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

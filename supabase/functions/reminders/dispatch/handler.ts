export interface ReminderEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  rsvp_deadline: string;
  event_timezone: string;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  location_url: string | null;
  status: string;
  deleted_at: string | null;
}

export interface ReminderScheduleRow {
  id: string;
  event_id: string;
  days_before_event: number;
  send_time_of_day: string;
  enabled: boolean;
  last_sent_at: string | null;
  event: ReminderEvent;
}

export interface TargetInvitation {
  id: string;
  event_id: string;
  status: "pending" | "tentative" | "accepted" | string;
  guest_email: string;
  guest_name: string | null;
  approved_attendee_count: number;
}

export interface OutgoingEmail {
  event_id: string;
  invitation_id: string;
  recipient_email: string;
  type: "reminder" | "invitation_nudge";
  subject: string;
  html: string;
  text: string;
}

export interface BatchSendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface EmailLogInsert {
  event_id: string;
  invitation_id: string;
  recipient_email: string;
  type: "reminder" | "invitation_nudge";
  status: "sent" | "failed";
  provider_message_id: string | null;
  sent_at: string | null;
}

export interface AuditLogInsert {
  actor_type: "system";
  actor_id: null;
  action: string;
  entity_type: string;
  entity_id: string;
  new_value: Record<string, unknown>;
}

export interface DispatchDependencies {
  serviceRoleKey: string;
  appBaseUrl: string;
  now: () => Date;
  fetchActiveSchedules: (eventId?: string) => Promise<ReminderScheduleRow[]>;
  fetchTargetInvitations: (eventId: string) => Promise<TargetInvitation[]>;
  sendEmailBatch: (emails: OutgoingEmail[]) => Promise<BatchSendResult[]>;
  insertEmailLogs: (logs: EmailLogInsert[]) => Promise<void>;
  markScheduleSent: (scheduleId: string, sentAtIso: string) => Promise<void>;
  insertAuditLog: (entry: AuditLogInsert) => Promise<void>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RESEND_BATCH_LIMIT = 100;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return jsonResponse({ code, message, details: null, hint: null }, status);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function getLocalDateParts(
  instant: Date,
  timeZone: string,
): { date: string; time: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}:${get("second")}`,
  };
}

function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d - days));
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeTime(timeStr: string): string {
  const parts = timeStr.trim().split(":");
  const hh = (parts[0] ?? "00").padStart(2, "0");
  const mm = (parts[1] ?? "00").padStart(2, "0");
  const ss = (parts[2] ?? "00").slice(0, 2).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function isScheduleDue(schedule: ReminderScheduleRow, now: Date): boolean {
  const { event } = schedule;
  if (!schedule.enabled) return false;
  if (event.status !== "published" || event.deleted_at !== null) return false;
  if (new Date(event.ends_at) <= now) return false;

  const tz = event.event_timezone || "UTC";
  const eventStartLocal = getLocalDateParts(new Date(event.starts_at), tz);
  const targetDate = subtractDays(eventStartLocal.date, schedule.days_before_event);
  const nowLocal = getLocalDateParts(now, tz);

  if (nowLocal.date !== targetDate) {
    return false;
  }

  if (nowLocal.time < normalizeTime(schedule.send_time_of_day)) {
    return false;
  }

  if (schedule.last_sent_at !== null) {
    const lastSentLocal = getLocalDateParts(new Date(schedule.last_sent_at), tz);
    if (lastSentLocal.date >= nowLocal.date) {
      return false;
    }
  }

  return true;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEventDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

function renderReminderEmail(
  schedule: ReminderScheduleRow,
  invitation: TargetInvitation,
  type: "reminder" | "invitation_nudge",
  appBaseUrl: string,
): OutgoingEmail {
  const { event } = schedule;
  const tz = event.event_timezone || "UTC";
  const guestName = invitation.guest_name?.trim() || "Guest";
  const portalUrl = `${appBaseUrl.replace(/\/+$/, "")}/guest`;
  const formattedStart = formatEventDateTime(event.starts_at, tz);
  const formattedDeadline = formatEventDateTime(event.rsvp_deadline, tz);
  const locationParts = [event.venue_name, event.address, event.city].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );
  const venueLine =
    locationParts.length > 0
      ? locationParts.join(", ")
      : "See event portal for location details";

  if (type === "invitation_nudge") {
    const subject = `RSVP Reminder: ${event.title} (${schedule.days_before_event} days away)`;
    const text = [
      `Hi ${guestName},`,
      "",
      `We haven't received your confirmed RSVP yet for ${event.title}.`,
      `When: ${formattedStart}`,
      `Where: ${venueLine}`,
      `RSVP Deadline: ${formattedDeadline}`,
      "",
      `Confirm your attendance in the guest portal: ${portalUrl}`,
    ].join("\n");

    const html = [
      `<p>Hi ${escapeHtml(guestName)},</p>`,
      `<p>We haven't received your confirmed RSVP yet for <strong>${escapeHtml(event.title)}</strong>.</p>`,
      `<ul>`,
      `<li><strong>When:</strong> ${escapeHtml(formattedStart)}</li>`,
      `<li><strong>Where:</strong> ${escapeHtml(venueLine)}</li>`,
      `<li><strong>RSVP Deadline:</strong> ${escapeHtml(formattedDeadline)}</li>`,
      `</ul>`,
      `<p><a href="${escapeHtml(portalUrl)}">Confirm your attendance in the guest portal</a></p>`,
    ].join("");

    return {
      event_id: event.id,
      invitation_id: invitation.id,
      recipient_email: invitation.guest_email,
      type,
      subject,
      html,
      text,
    };
  }

  const dayLabel = schedule.days_before_event === 1 ? "tomorrow" : `in ${schedule.days_before_event} days`;
  const subject = `Event Reminder: ${event.title} is ${dayLabel}`;
  const attendeeNote =
    invitation.approved_attendee_count > 0
      ? `Approved attendees on your pass: ${invitation.approved_attendee_count}`
      : "Please ensure your attendee roster is submitted in the guest portal.";

  const text = [
    `Hi ${guestName},`,
    "",
    `This is a reminder that ${event.title} is ${dayLabel}.`,
    `When: ${formattedStart}`,
    `Where: ${venueLine}`,
    attendeeNote,
    "",
    `View your invitation and QR passes in the guest portal: ${portalUrl}`,
  ].join("\n");

  const html = [
    `<p>Hi ${escapeHtml(guestName)},</p>`,
    `<p>This is a reminder that <strong>${escapeHtml(event.title)}</strong> is ${escapeHtml(dayLabel)}.</p>`,
    `<ul>`,
    `<li><strong>When:</strong> ${escapeHtml(formattedStart)}</li>`,
    `<li><strong>Where:</strong> ${escapeHtml(venueLine)}</li>`,
    `<li>${escapeHtml(attendeeNote)}</li>`,
    `</ul>`,
    `<p><a href="${escapeHtml(portalUrl)}">View your invitation and QR passes</a></p>`,
  ].join("");

  return {
    event_id: event.id,
    invitation_id: invitation.id,
    recipient_email: invitation.guest_email,
    type,
    subject,
    html,
    text,
  };
}

export function createDispatchHandler(deps: DispatchDependencies) {
  return async (req: Request): Promise<Response> => {
    const { pathname } = new URL(req.url);
    if (
      pathname !== "/functions/v1/reminders/dispatch" &&
      pathname !== "/reminders/dispatch" &&
      pathname !== "/dispatch"
    ) {
      return errorResponse("NOT_FOUND", "Not Found.", 404);
    }

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method Not Allowed.", 405);
    }

    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) {
      return errorResponse("UNAUTHORIZED", "Unauthorized.", 401);
    }

    const token = authorization.slice("Bearer ".length).trim();
    if (!timingSafeEqual(token, deps.serviceRoleKey)) {
      return errorResponse("UNAUTHORIZED", "Unauthorized.", 401);
    }

    let eventIdFilter: string | undefined;
    let dryRun = false;

    const rawBody = (await req.text()).trim();
    if (rawBody.length > 0) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        return errorResponse("INVALID_JSON", "Request body must be valid JSON.", 400);
      }

      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return errorResponse("INVALID_REQUEST", "Request body must be a JSON object.", 400);
      }

      const body = parsed as Record<string, unknown>;
      if (body.event_id !== undefined && body.event_id !== null) {
        if (typeof body.event_id !== "string" || !uuidPattern.test(body.event_id)) {
          return errorResponse("INVALID_EVENT_ID", "event_id must be a valid UUID.", 400);
        }
        eventIdFilter = body.event_id;
      }

      if (body.dry_run !== undefined && body.dry_run !== null) {
        if (typeof body.dry_run !== "boolean") {
          return errorResponse("INVALID_DRY_RUN", "dry_run must be a boolean.", 400);
        }
        dryRun = body.dry_run;
      }
    }

    const now = deps.now();
    const nowIso = now.toISOString();
    const schedules = await deps.fetchActiveSchedules(eventIdFilter);
    const dueSchedules = schedules.filter((schedule) => isScheduleDue(schedule, now));

    let totalSentCount = 0;
    let processedSchedules = 0;

    for (const schedule of dueSchedules) {
      const invitations = await deps.fetchTargetInvitations(schedule.event_id);
      const isBeforeRsvpDeadline = now < new Date(schedule.event.rsvp_deadline);
      const outgoing: OutgoingEmail[] = [];

      for (const invitation of invitations) {
        const email = invitation.guest_email?.trim();
        if (!email) continue;

        if (invitation.status === "accepted") {
          outgoing.push(
            renderReminderEmail(
              schedule,
              { ...invitation, guest_email: email },
              "reminder",
              deps.appBaseUrl,
            ),
          );
        } else if (
          isBeforeRsvpDeadline &&
          (invitation.status === "pending" || invitation.status === "tentative")
        ) {
          outgoing.push(
            renderReminderEmail(
              schedule,
              { ...invitation, guest_email: email },
              "invitation_nudge",
              deps.appBaseUrl,
            ),
          );
        }
      }

      if (dryRun) {
        totalSentCount += outgoing.length;
        processedSchedules += 1;
        continue;
      }

      let scheduleSent = 0;
      let scheduleFailed = 0;
      let reminderCount = 0;
      let nudgeCount = 0;
      const emailLogs: EmailLogInsert[] = [];

      for (let i = 0; i < outgoing.length; i += RESEND_BATCH_LIMIT) {
        const chunk = outgoing.slice(i, i + RESEND_BATCH_LIMIT);
        const results = await deps.sendEmailBatch(chunk);

        chunk.forEach((email, idx) => {
          const res = results[idx] ?? { ok: false, error: "Missing batch result" };
          if (res.ok) {
            scheduleSent += 1;
            if (email.type === "reminder") reminderCount += 1;
            else nudgeCount += 1;
          } else {
            scheduleFailed += 1;
          }

          emailLogs.push({
            event_id: email.event_id,
            invitation_id: email.invitation_id,
            recipient_email: email.recipient_email,
            type: email.type,
            status: res.ok ? "sent" : "failed",
            provider_message_id: res.ok ? (res.id ?? null) : (res.error ?? null),
            sent_at: res.ok ? nowIso : null,
          });
        });
      }

      if (emailLogs.length > 0) {
        await deps.insertEmailLogs(emailLogs);
      }

      await deps.markScheduleSent(schedule.id, nowIso);
      await deps.insertAuditLog({
        actor_type: "system",
        actor_id: null,
        action: "reminder.dispatched",
        entity_type: "reminder_schedule",
        entity_id: schedule.id,
        new_value: {
          event_id: schedule.event_id,
          sent_count: scheduleSent,
          failed_count: scheduleFailed,
          reminder_count: reminderCount,
          nudge_count: nudgeCount,
        },
      });

      totalSentCount += scheduleSent;
      processedSchedules += 1;
    }

    return jsonResponse(
      dryRun
        ? { sent_count: totalSentCount, processed_schedules: processedSchedules, dry_run: true }
        : { sent_count: totalSentCount, processed_schedules: processedSchedules },
      200,
    );
  };
}

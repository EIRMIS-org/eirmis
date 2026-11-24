import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { resolveResendFrom, resolveResendTo } from "../../_shared/resend.ts";
import {
  createDispatchHandler,
  type BatchSendResult,
  type OutgoingEmail,
  type ReminderEvent,
  type ReminderScheduleRow,
  type TargetInvitation,
} from "./handler.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const resendFromEmail =
  Deno.env.get("RESEND_FROM_EMAIL") || "EIRMIS <noreply@eirmis.local>";
const appBaseUrl =
  Deno.env.get("APP_URL") ||
  Deno.env.get("SITE_URL") ||
  Deno.env.get("VITE_SITE_URL") ||
  "http://localhost:5173";

if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
  throw new Error("Reminders dispatch function is missing required configuration.");
}

const serviceClient = createClient(supabaseUrl, serviceRoleKey);

interface ScheduleQueryRow {
  id: string;
  event_id: string;
  days_before_event: number;
  send_time_of_day: string;
  enabled: boolean;
  last_sent_at: string | null;
  events: ReminderEvent | ReminderEvent[];
}

interface InvitationQueryRow {
  id: string;
  event_id: string;
  status: string;
  party_size: number;
  guests: { email: string; full_name: string } | { email: string; full_name: string }[] | null;
}

const handler = createDispatchHandler({
  serviceRoleKey,
  appBaseUrl,
  now: () => new Date(),

  async fetchActiveSchedules(eventId?: string): Promise<ReminderScheduleRow[]> {
    let query = serviceClient
      .from("reminder_schedules")
      .select(
        "id, event_id, days_before_event, send_time_of_day, enabled, last_sent_at, events!inner(id, title, starts_at, ends_at, rsvp_deadline, event_timezone, venue_name, address, city, location_url, status, deleted_at)",
      )
      .eq("enabled", true)
      .eq("events.status", "published")
      .is("events.deleted_at", null);

    if (eventId) {
      query = query.eq("event_id", eventId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return ((data ?? []) as ScheduleQueryRow[]).map((row) => {
      const event = Array.isArray(row.events) ? row.events[0] : row.events;
      return {
        id: row.id,
        event_id: row.event_id,
        days_before_event: row.days_before_event,
        send_time_of_day: row.send_time_of_day,
        enabled: row.enabled,
        last_sent_at: row.last_sent_at,
        event,
      };
    });
  },

  async fetchTargetInvitations(eventId: string): Promise<TargetInvitation[]> {
    const { data, error } = await serviceClient
      .from("invitations")
      .select("id, event_id, status, party_size, guests!inner(email, full_name)")
      .eq("event_id", eventId)
      .in("status", ["accepted", "pending", "tentative"]);

    if (error) throw error;

    return ((data ?? []) as InvitationQueryRow[]).map((row) => {
      const guest = Array.isArray(row.guests) ? row.guests[0] : row.guests;
      return {
        id: row.id,
        event_id: row.event_id,
        status: row.status,
        guest_email: guest?.email ?? "",
        guest_name: guest?.full_name ?? null,
        approved_attendee_count: row.party_size ?? 0,
      };
    });
  },

  async sendEmailBatch(emails: OutgoingEmail[]): Promise<BatchSendResult[]> {
    if (emails.length === 0) return [];

    try {
      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          emails.map((email) => ({
            from: resolveResendFrom(resendFromEmail),
            to: [resolveResendTo(email.recipient_email, resolveResendFrom(resendFromEmail))],
            subject: email.subject,
            html: email.html,
            text: email.text,
          })),
        ),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(payload?.data)) {
        const errMsg = `Resend batch error: ${response.status}`;
        return emails.map(() => ({ ok: false, error: errMsg }));
      }

      return emails.map((_, index) => {
        const item = payload.data[index];
        if (item && typeof item.id === "string") {
          return { ok: true, id: item.id };
        }
        return { ok: false, error: "Missing Resend message id" };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return emails.map(() => ({ ok: false, error: message }));
    }
  },

  async insertEmailLogs(logs) {
    const { error } = await serviceClient.from("email_logs").insert(logs);
    if (error) {
      console.error("Failed to insert email_logs:", error);
    }
  },

  async markScheduleSent(scheduleId: string, sentAtIso: string) {
    const { error } = await serviceClient
      .from("reminder_schedules")
      .update({ last_sent_at: sentAtIso })
      .eq("id", scheduleId);
    if (error) {
      throw error;
    }
  },

  async insertAuditLog(entry) {
    const { error } = await serviceClient.from("audit_log_entries").insert(entry);
    if (error) {
      console.error("Failed to insert audit_log_entries:", error);
    }
  },
});

serve(handler);

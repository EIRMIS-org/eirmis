import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDispatchHandler,
  isScheduleDue,
  type DispatchDependencies,
  type OutgoingEmail,
  type ReminderEvent,
  type ReminderScheduleRow,
  type TargetInvitation,
} from "./handler.ts";

const SERVICE_KEY = "test-service-role-key-secret";

function makeEvent(overrides: Partial<ReminderEvent> = {}): ReminderEvent {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Annual Gala 2026",
    // 2026-11-20 18:00 Asia/Manila (UTC+8) = 2026-11-20T10:00:00Z
    starts_at: "2026-11-20T10:00:00.000Z",
    ends_at: "2026-11-20T14:00:00.000Z",
    // 2026-11-18 23:59 Asia/Manila = 2026-11-18T15:59:00Z
    rsvp_deadline: "2026-11-18T15:59:00.000Z",
    event_timezone: "Asia/Manila",
    venue_name: "Grand Ballroom",
    address: "123 Ayala Ave",
    city: "Makati",
    location_url: null,
    status: "published",
    deleted_at: null,
    ...overrides,
  };
}

function makeSchedule(overrides: Partial<ReminderScheduleRow> = {}): ReminderScheduleRow {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    event_id: "11111111-1111-1111-1111-111111111111",
    days_before_event: 3,
    send_time_of_day: "09:00:00",
    enabled: true,
    last_sent_at: null,
    event: makeEvent(),
    ...overrides,
  };
}

function makeRequest(
  body?: string,
  authHeader: string | null = `Bearer ${SERVICE_KEY}`,
  path = "/functions/v1/reminders/dispatch",
  method = "POST",
): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader !== null) {
    headers.Authorization = authHeader;
  }
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: method === "POST" ? body : undefined,
  });
}

describe("sendReminders dispatch handler", () => {
  let deps: DispatchDependencies;
  // 2026-11-17 09:05:00 Asia/Manila = 2026-11-17T01:05:00Z (3 days before Nov 20)
  const now = new Date("2026-11-17T01:05:00.000Z");

  const defaultInvitations: TargetInvitation[] = [
    {
      id: "aaaa1111-1111-1111-1111-111111111111",
      event_id: "11111111-1111-1111-1111-111111111111",
      status: "accepted",
      guest_email: "alice@example.com",
      guest_name: "Alice Reyes",
      approved_attendee_count: 2,
    },
    {
      id: "bbbb2222-2222-2222-2222-222222222222",
      event_id: "11111111-1111-1111-1111-111111111111",
      status: "pending",
      guest_email: "bob@example.com",
      guest_name: "Bob Cruz",
      approved_attendee_count: 0,
    },
    {
      id: "cccc3333-3333-3333-3333-333333333333",
      event_id: "11111111-1111-1111-1111-111111111111",
      status: "tentative",
      guest_email: "cara@example.com",
      guest_name: "Cara Lim",
      approved_attendee_count: 0,
    },
  ];

  beforeEach(() => {
    deps = {
      serviceRoleKey: SERVICE_KEY,
      appBaseUrl: "https://eirmis.example.com",
      now: () => now,
      fetchActiveSchedules: vi.fn().mockResolvedValue([makeSchedule()]),
      fetchTargetInvitations: vi.fn().mockResolvedValue(defaultInvitations),
      sendEmailBatch: vi.fn().mockImplementation(async (emails: OutgoingEmail[]) =>
        emails.map((_, idx) => ({ ok: true, id: `resend_msg_${idx + 1}` })),
      ),
      insertEmailLogs: vi.fn().mockResolvedValue(undefined),
      markScheduleSent: vi.fn().mockResolvedValue(undefined),
      insertAuditLog: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("rejects missing or non-service-role authorization with 401", async () => {
    const handler = createDispatchHandler(deps);

    const noAuth = await handler(makeRequest("{}", null));
    expect(noAuth.status).toBe(401);

    const wrongToken = await handler(makeRequest("{}", "Bearer user-jwt-token"));
    expect(wrongToken.status).toBe(401);

    expect(deps.fetchActiveSchedules).not.toHaveBeenCalled();
  });

  it("rejects wrong path with 404 and non-POST with 405", async () => {
    const handler = createDispatchHandler(deps);

    const wrongPath = await handler(makeRequest("{}", `Bearer ${SERVICE_KEY}`, "/reminders/other"));
    expect(wrongPath.status).toBe(404);

    const wrongMethod = await handler(
      makeRequest(undefined, `Bearer ${SERVICE_KEY}`, "/functions/v1/reminders/dispatch", "GET"),
    );
    expect(wrongMethod.status).toBe(405);
  });

  it("validates optional JSON body fields", async () => {
    const handler = createDispatchHandler(deps);

    const badJson = await handler(makeRequest("{not-json"));
    expect(badJson.status).toBe(400);

    const badEventId = await handler(makeRequest(JSON.stringify({ event_id: "not-a-uuid" })));
    expect(badEventId.status).toBe(400);

    const badDryRun = await handler(makeRequest(JSON.stringify({ dry_run: "yes" })));
    expect(badDryRun.status).toBe(400);
  });

  it("evaluates due schedules in event_timezone and prevents duplicate daily sends", () => {
    const schedule = makeSchedule();

    // 08:59 Manila -> not yet 09:00
    expect(isScheduleDue(schedule, new Date("2026-11-17T00:59:00.000Z"))).toBe(false);

    // 09:00 Manila -> due
    expect(isScheduleDue(schedule, new Date("2026-11-17T01:00:00.000Z"))).toBe(true);

    // Already sent earlier today in Manila (09:00 Manila)
    const alreadySentToday = makeSchedule({
      last_sent_at: "2026-11-17T01:00:00.000Z",
    });
    expect(isScheduleDue(alreadySentToday, new Date("2026-11-17T02:00:00.000Z"))).toBe(false);

    // Inactive / draft / deleted / ended events are not due
    expect(
      isScheduleDue(makeSchedule({ enabled: false }), new Date("2026-11-17T01:05:00.000Z")),
    ).toBe(false);
    expect(
      isScheduleDue(
        makeSchedule({ event: makeEvent({ status: "draft" }) }),
        new Date("2026-11-17T01:05:00.000Z"),
      ),
    ).toBe(false);
    expect(
      isScheduleDue(
        makeSchedule({ event: makeEvent({ deleted_at: "2026-11-16T00:00:00.000Z" }) }),
        new Date("2026-11-17T01:05:00.000Z"),
      ),
    ).toBe(false);
  });

  it("dispatches countdown reminders to accepted guests and nudges to pending/tentative before deadline", async () => {
    const handler = createDispatchHandler(deps);
    const res = await handler(makeRequest(""));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ sent_count: 3, processed_schedules: 1 });

    expect(deps.sendEmailBatch).toHaveBeenCalledTimes(1);
    const sentEmails = (deps.sendEmailBatch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as OutgoingEmail[];

    expect(sentEmails).toHaveLength(3);
    expect(sentEmails[0]).toMatchObject({
      recipient_email: "alice@example.com",
      type: "reminder",
    });
    expect(sentEmails[0].text).toContain("Approved attendees on your pass: 2");
    expect(sentEmails[0].text).toContain("https://eirmis.example.com/guest");

    expect(sentEmails[1]).toMatchObject({
      recipient_email: "bob@example.com",
      type: "invitation_nudge",
    });
    expect(sentEmails[2]).toMatchObject({
      recipient_email: "cara@example.com",
      type: "invitation_nudge",
    });

    expect(deps.insertEmailLogs).toHaveBeenCalledTimes(1);
    expect(deps.markScheduleSent).toHaveBeenCalledWith(
      "22222222-2222-2222-2222-222222222222",
      now.toISOString(),
    );
    expect(deps.insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_type: "system",
        actor_id: null,
        action: "reminder.dispatched",
        entity_type: "reminder_schedule",
        entity_id: "22222222-2222-2222-2222-222222222222",
        new_value: {
          event_id: "11111111-1111-1111-1111-111111111111",
          sent_count: 3,
          failed_count: 0,
          reminder_count: 1,
          nudge_count: 2,
        },
      }),
    );
  });

  it("skips RSVP nudges once rsvp_deadline has passed", async () => {
    deps.fetchActiveSchedules = vi.fn().mockResolvedValue([
      makeSchedule({
        event: makeEvent({ rsvp_deadline: "2026-11-17T00:00:00.000Z" }),
      }),
    ]);

    const handler = createDispatchHandler(deps);
    const res = await handler(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent_count: 1, processed_schedules: 1 });

    const sentEmails = (deps.sendEmailBatch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as OutgoingEmail[];
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].type).toBe("reminder");
  });

  it("logs partial failures and still marks schedule sent to prevent duplicate spam", async () => {
    deps.sendEmailBatch = vi.fn().mockResolvedValue([
      { ok: true, id: "resend_ok_1" },
      { ok: false, error: "Bounce error" },
      { ok: true, id: "resend_ok_3" },
    ]);

    const handler = createDispatchHandler(deps);
    const res = await handler(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent_count: 2, processed_schedules: 1 });

    expect(deps.insertEmailLogs).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ recipient_email: "alice@example.com", status: "sent", provider_message_id: "resend_ok_1" }),
        expect.objectContaining({ recipient_email: "bob@example.com", status: "failed", provider_message_id: "Bounce error", sent_at: null }),
        expect.objectContaining({ recipient_email: "cara@example.com", status: "sent", provider_message_id: "resend_ok_3" }),
      ]),
    );
    expect(deps.markScheduleSent).toHaveBeenCalledTimes(1);
  });

  it("supports dry_run without sending emails or mutating state", async () => {
    const handler = createDispatchHandler(deps);
    const res = await handler(makeRequest(JSON.stringify({ dry_run: true })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      sent_count: 3,
      processed_schedules: 1,
      dry_run: true,
    });

    expect(deps.sendEmailBatch).not.toHaveBeenCalled();
    expect(deps.insertEmailLogs).not.toHaveBeenCalled();
    expect(deps.markScheduleSent).not.toHaveBeenCalled();
    expect(deps.insertAuditLog).not.toHaveBeenCalled();
  });

  it("chunks outgoing emails into batches of 100", async () => {
    const manyInvitations: TargetInvitation[] = Array.from({ length: 105 }, (_, i) => ({
      id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
      event_id: "11111111-1111-1111-1111-111111111111",
      status: "accepted",
      guest_email: `guest${i + 1}@example.com`,
      guest_name: `Guest ${i + 1}`,
      approved_attendee_count: 1,
    }));
    deps.fetchTargetInvitations = vi.fn().mockResolvedValue(manyInvitations);

    const handler = createDispatchHandler(deps);
    const res = await handler(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent_count: 105, processed_schedules: 1 });

    expect(deps.sendEmailBatch).toHaveBeenCalledTimes(2);
    expect((deps.sendEmailBatch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toHaveLength(100);
    expect((deps.sendEmailBatch as ReturnType<typeof vi.fn>).mock.calls[1][0]).toHaveLength(5);
  });
});

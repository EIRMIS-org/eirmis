// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { listAttendees, listHeadcountRequests, listInvitations, setRole } from "@/lib/api";
import { resetMockOrganizerState } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { ActivityTab } from "./activity-tab";

const EVENT_ID = "55555555-5555-5555-5555-555555555555";

function renderActivityTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <ActivityTab eventId={EVENT_ID} />
    </QueryClientProvider>,
  );
  return { ...view, switchEvent: (eventId: string) => view.rerender(
    <QueryClientProvider client={queryClient}><ActivityTab eventId={eventId} /></QueryClientProvider>,
  ) };
}

const OTHER_EVENT = "55555555-5555-5555-5555-555555555599";
const entityTables = {
  invitation: "invitations",
  attendee: "attendees",
  headcount_increase_request: "headcount_increase_requests",
  reminder_schedule: "reminder_schedules",
  invitation_design: "invitation_designs",
  checkin_assignment: "checkin_assignments",
};

function seedEventAuditHistory() {
  const logs = [EVENT_ID, OTHER_EVENT].flatMap((eventId, eventIndex) =>
    ["event", ...Object.keys(entityTables)].map((type, index) => ({
      id: `audit-${eventIndex}-${index}`, entity_type: type,
      entity_id: type === "event" ? eventId : `${eventId}-${type}`,
      actor_type: "organizer", action: `event${eventIndex}.${type}`,
      reason: null, created_at: "2026-11-01T00:00:00Z",
    })),
  );
  logs.push({ ...logs[0], id: "unrelated", entity_type: "organizer_profile", action: "unrelated.profile" });
  logs.push({ ...logs[0], id: "deleted", entity_type: "attendee", entity_id: "deleted-attendee", action: "unresolved.deleted" });
  server.use(
    http.get("*/rest/v1/audit_log_entries", () => HttpResponse.json(logs)),
    ...Object.entries(entityTables).map(([type, table]) =>
      http.get(`*/rest/v1/${table}`, () => HttpResponse.json(
        [EVENT_ID, OTHER_EVENT].map((eventId) => ({
          id: `${eventId}-${type}`, event_id: eventId, invitation_id: `${eventId}-invitation`,
        })),
      )),
    ),
  );
}

describe("ActivityTab", () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    cleanup();
    resetMockOrganizerState();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("uses mock membership endpoints that honor pagination", async () => {
    setRole("organizer");
    for (const load of [listInvitations, listAttendees, listHeadcountRequests]) {
      const rows = await load();
      expect(rows.length).toBeGreaterThan(0);
      expect(await load({ limit: 1, offset: 0 })).toEqual(rows.slice(0, 1));
      expect(await load({ limit: 1, offset: rows.length })).toEqual([]);
    }
  });

  it("renders loading skeletons then email logs and audit trail", async () => {
    setRole("organizer");
    renderActivityTab();

    expect(screen.getByLabelText("Loading email logs")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Loading audit log entries"),
    ).toBeInTheDocument();

    expect(await screen.findByText("guest@example.com")).toBeInTheDocument();
    expect(screen.getByText("rsvp_confirmation")).toBeInTheDocument();
    expect(await screen.findByText("attendee.approved")).toBeInTheDocument();
    expect(screen.getByText("Verified team member")).toBeInTheDocument();
  });

  it("renders error states with retry and empty states", async () => {
    setRole("organizer");
    let failEmail = true;
    let failAudit = true;

    server.use(
      http.get("*/rest/v1/email_logs", () => {
        if (failEmail) {
          failEmail = false;
          return HttpResponse.json(
            { code: "500", message: "Error", details: null, hint: null },
            { status: 500 },
          );
        }
        return HttpResponse.json([]);
      }),
      http.get("*/rest/v1/audit_log_entries", () => {
        if (failAudit) {
          failAudit = false;
          return HttpResponse.json(
            { code: "500", message: "Error", details: null, hint: null },
            { status: 500 },
          );
        }
        return HttpResponse.json([]);
      }),
    );

    const user = userEvent.setup();
    renderActivityTab();

    expect(
      await screen.findByText("Unable to load email delivery logs."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Unable to load audit log entries."),
    ).toBeInTheDocument();

    const retryButtons = screen.getAllByRole("button", { name: /retry/i });
    await user.click(retryButtons[0]);
    await user.click(retryButtons[1]);

    expect(
      await screen.findByText("No emails sent for this event yet"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("No audit log entries recorded yet"),
    ).toBeInTheDocument();
  });

  it("scopes all supported entity types and switches events without showing the previous history", async () => {
    setRole("organizer");
    seedEventAuditHistory();
    const view = renderActivityTab();
    await screen.findByText("event0.event");
    for (const type of ["event", ...Object.keys(entityTables)]) {
      expect(screen.getByText(`event0.${type}`)).toBeInTheDocument();
      expect(screen.queryByText(`event1.${type}`)).not.toBeInTheDocument();
    }
    expect(screen.queryByText("unrelated.profile")).not.toBeInTheDocument();
    expect(screen.queryByText("unresolved.deleted")).not.toBeInTheDocument();
    view.switchEvent(OTHER_EVENT);
    expect(screen.queryByText("event0.event")).not.toBeInTheDocument();
    await screen.findByText("event1.event");
    for (const type of ["event", ...Object.keys(entityTables)]) {
      expect(screen.getByText(`event1.${type}`)).toBeInTheDocument();
      expect(screen.queryByText(`event0.${type}`)).not.toBeInTheDocument();
    }
  });

  it("waits for child relationships before displaying any audit rows or empty state", async () => {
    setRole("organizer");
    seedEventAuditHistory();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let requested = false;
    server.use(http.get("*/rest/v1/attendees", async () => {
      requested = true;
      await pending;
      return HttpResponse.json([]);
    }));
    renderActivityTab();
    try {
      await waitFor(() => expect(requested).toBe(true));
      expect(screen.getByLabelText("Loading audit log entries")).toBeInTheDocument();
      expect(screen.queryByText("event0.event")).not.toBeInTheDocument();
      expect(screen.queryByText("event1.event")).not.toBeInTheDocument();
      expect(screen.queryByText("No audit log entries recorded yet")).not.toBeInTheDocument();
    } finally {
      release();
    }
    await screen.findByText("event0.event");
    expect(screen.queryByText("event1.event")).not.toBeInTheDocument();
  });

  it("shows relationship failures and retries the complete scoped query", async () => {
    setRole("organizer");
    seedEventAuditHistory();
    let fail = true;
    server.use(http.get("*/rest/v1/headcount_increase_requests", () => {
      if (fail) {
        fail = false;
        return HttpResponse.json({ message: "Unavailable" }, { status: 500 });
      }
      return HttpResponse.json([]);
    }));
    const user = userEvent.setup();
    renderActivityTab();
    await screen.findByText("Unable to load audit log entries.");
    expect(screen.queryByText("event1.event")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    await screen.findByText("event0.event");
    expect(screen.queryByText("event1.event")).not.toBeInTheDocument();
  });

  it("includes child audit history whose membership is on a later page", async () => {
    setRole("organizer");
    seedEventAuditHistory();
    const offsets: number[] = [];
    const attendees = [
      ...Array.from({ length: 500 }, (_, index) => ({ id: `other-${index}`, invitation_id: `${OTHER_EVENT}-invitation` })),
      { id: `${EVENT_ID}-attendee`, invitation_id: `${EVENT_ID}-invitation` },
    ];
    server.use(http.get("*/rest/v1/attendees", ({ request }) => {
      const url = new URL(request.url);
      const offset = Number(url.searchParams.get("offset"));
      const limit = Number(url.searchParams.get("limit"));
      offsets.push(offset);
      return HttpResponse.json(attendees.slice(offset, offset + limit));
    }));
    renderActivityTab();
    expect(await screen.findByText("event0.attendee")).toBeInTheDocument();
    expect(screen.queryByText("event1.attendee")).not.toBeInTheDocument();
    expect(offsets).toEqual([0, 500]);
  });

  it("requests audit log entries ordered created_at.desc and pages through all results", async () => {
    setRole("organizer");
    seedEventAuditHistory();

    const capturedOrders: (string | null)[] = [];
    const capturedOffsets: number[] = [];
    // Generate 1200 audit log entries to test past the 1,000-row Supabase boundary (3 pages of limit 500)
    const largeAuditList = Array.from({ length: 1200 }, (_, i) => ({
      id: `large-audit-${i}`,
      entity_type: "event",
      entity_id: EVENT_ID,
      actor_type: "organizer",
      action: i === 0 ? "newest.action" : i === 1199 ? "oldest.action" : `middle.action.${i}`,
      reason: null,
      created_at: new Date(Date.now() - i * 1000).toISOString(),
    }));

    server.use(
      http.get("*/rest/v1/audit_log_entries", ({ request }) => {
        const url = new URL(request.url);
        capturedOrders.push(url.searchParams.get("order"));
        const offset = Number(url.searchParams.get("offset") ?? 0);
        const limit = Number(url.searchParams.get("limit") ?? 500);
        capturedOffsets.push(offset);
        return HttpResponse.json(largeAuditList.slice(offset, offset + limit));
      }),
    );

    renderActivityTab();

    // Verify newest entry is rendered and oldest entry on page 3 is also included
    expect(await screen.findByText("newest.action")).toBeInTheDocument();
    expect(capturedOrders[0]).toBe("created_at.desc");
    expect(capturedOffsets).toEqual([0, 500, 1000]);
  });

  it("scopes headcount request queries to event invitation IDs via chunking", async () => {
    setRole("organizer");
    seedEventAuditHistory();

    const capturedInvitationFilters: (string | null)[] = [];
    server.use(
      http.get("*/rest/v1/headcount_increase_requests", ({ request }) => {
        const url = new URL(request.url);
        capturedInvitationFilters.push(url.searchParams.get("invitation_id"));
        return HttpResponse.json([]);
      }),
    );

    renderActivityTab();
    await screen.findByText("event0.event");

    expect(capturedInvitationFilters.length).toBeGreaterThan(0);
    // The filter must use in.(<invitation_id>) rather than querying all headcount requests
    expect(capturedInvitationFilters[0]).toContain(`in.(${EVENT_ID}-invitation)`);
  });

  it("renders correctly for events with zero invitations, attendees, headcount requests, and audit entries", async () => {
    setRole("organizer");

    const EMPTY_EVENT_ID = "55555555-5555-5555-5555-555555555500";
    server.use(
      http.get("*/rest/v1/invitations", () => HttpResponse.json([])),
      http.get("*/rest/v1/attendees", () => HttpResponse.json([])),
      http.get("*/rest/v1/headcount_increase_requests", () => HttpResponse.json([])),
      http.get("*/rest/v1/reminder_schedules", () => HttpResponse.json([])),
      http.get("*/rest/v1/invitation_designs", () => HttpResponse.json([])),
      http.get("*/rest/v1/checkin_assignments", () => HttpResponse.json([])),
      http.get("*/rest/v1/email_logs", () => HttpResponse.json([])),
      http.get("*/rest/v1/audit_log_entries", () => HttpResponse.json([])),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ActivityTab eventId={EMPTY_EVENT_ID} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("No emails sent for this event yet")).toBeInTheDocument();
    expect(await screen.findByText("No audit log entries recorded yet")).toBeInTheDocument();
  });
});

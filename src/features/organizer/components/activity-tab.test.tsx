// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setRole } from "@/lib/api";
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
});

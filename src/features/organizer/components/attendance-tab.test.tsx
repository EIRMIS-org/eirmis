// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ACTIVITY_REFETCH_INTERVAL_MS } from "@/features/organizer/hooks/use-list-email-logs";
import { AUDIT_LOG_REFETCH_INTERVAL_MS } from "@/features/organizer/hooks/use-list-audit-log-entries";
import { setRole } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { resetMockOrganizerState } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import {
  ATTENDANCE_REFETCH_INTERVAL_MS,
  AttendanceTab,
} from "./attendance-tab";

const EVENT_ID = "55555555-5555-5555-5555-555555555555";
const INVITATION_ID = "66666666-6666-6666-6666-666666666666";

function renderAttendanceTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AttendanceTab eventId={EVENT_ID} />
      </QueryClientProvider>,
    ),
  };
}

describe("AttendanceTab", () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    cleanup();
    resetMockOrganizerState();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("computes expected vs checked-in summary metrics from invitations and attendees", async () => {
    setRole("organizer");
    server.use(
      http.get("*/rest/v1/attendees", () =>
        HttpResponse.json([
          {
            id: "77777777-7777-7777-7777-777777777777",
            invitation_id: INVITATION_ID,
            full_name: "Maria Santos",
            email: "maria.santos@example.com",
            is_primary: true,
            status: "approved",
            submitted_at: "2026-10-05T14:00:00+08:00",
            reviewed_by: "11111111-1111-1111-1111-111111111111",
            reviewed_at: "2026-10-06T09:00:00+08:00",
            review_reason: null,
            qr_token: "token-1",
            checked_in: true,
            checked_in_at: "2026-12-15T18:05:00+08:00",
            checked_in_by: "44444444-4444-4444-4444-444444444444",
            is_walk_in: false,
          },
          {
            id: "77777777-7777-7777-7777-777777777778",
            invitation_id: INVITATION_ID,
            full_name: "Carlo Santos",
            email: "carlo.santos@example.com",
            is_primary: false,
            status: "approved",
            submitted_at: "2026-10-05T14:10:00+08:00",
            reviewed_by: "11111111-1111-1111-1111-111111111111",
            reviewed_at: "2026-10-06T09:00:00+08:00",
            review_reason: null,
            qr_token: "token-2",
            checked_in: false,
            checked_in_at: null,
            checked_in_by: null,
            is_walk_in: false,
          },
        ]),
      ),
    );

    renderAttendanceTab();

    expect(await screen.findByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("Carlo Santos")).toBeInTheDocument();

    // Accepted invitation has party_size = 2; 1 attendee is checked in
    expect(screen.getByTestId("attendance-expected-count")).toHaveTextContent(
      "2",
    );
    expect(screen.getByTestId("attendance-checked-in-count")).toHaveTextContent(
      "1",
    );
    expect(screen.getByText("Checked in")).toBeInTheDocument();
    expect(screen.getByText("Not checked in")).toBeInTheDocument();
  });

  it("filters the check-in feed by name or email", async () => {
    setRole("organizer");
    server.use(
      http.get("*/rest/v1/attendees", () =>
        HttpResponse.json([
          {
            id: "77777777-7777-7777-7777-777777777777",
            invitation_id: INVITATION_ID,
            full_name: "Maria Santos",
            email: "maria.santos@example.com",
            is_primary: true,
            status: "approved",
            submitted_at: "2026-10-05T14:00:00+08:00",
            reviewed_by: null,
            reviewed_at: null,
            review_reason: null,
            qr_token: "token-1",
            checked_in: true,
            checked_in_at: "2026-12-15T18:05:00+08:00",
            checked_in_by: null,
            is_walk_in: false,
          },
          {
            id: "77777777-7777-7777-7777-777777777778",
            invitation_id: INVITATION_ID,
            full_name: "Carlo Dizon",
            email: "carlo.dizon@example.com",
            is_primary: false,
            status: "approved",
            submitted_at: "2026-10-05T14:10:00+08:00",
            reviewed_by: null,
            reviewed_at: null,
            review_reason: null,
            qr_token: "token-2",
            checked_in: false,
            checked_in_at: null,
            checked_in_by: null,
            is_walk_in: false,
          },
        ]),
      ),
    );

    const user = userEvent.setup();
    renderAttendanceTab();

    await screen.findByText("Maria Santos");
    expect(screen.getByText("2 attendees")).toBeInTheDocument();

    const searchInput = screen.getByRole("searchbox", {
      name: /search attendees by name or email/i,
    });
    await user.type(searchInput, "dizon");

    expect(screen.getByText("2 attendees (1 matching)")).toBeInTheDocument();
    expect(screen.queryByText("Maria Santos")).not.toBeInTheDocument();
    expect(screen.getByText("Carlo Dizon")).toBeInTheDocument();
  });

  it("renders the empty state when no attendees exist for the event", async () => {
    setRole("organizer");
    server.use(http.get("*/rest/v1/attendees", () => HttpResponse.json([])));

    renderAttendanceTab();

    expect(
      await screen.findByText(
        "No attendees yet — approvals will populate this view",
      ),
    ).toBeInTheDocument();
  });

  it("configures a 30s refetch interval on attendance and activity queries", async () => {
    setRole("organizer");
    const { queryClient } = renderAttendanceTab();

    await screen.findByText("Maria Santos");

    expect(ATTENDANCE_REFETCH_INTERVAL_MS).toBe(30_000);
    expect(ACTIVITY_REFETCH_INTERVAL_MS).toBe(30_000);
    expect(AUDIT_LOG_REFETCH_INTERVAL_MS).toBe(30_000);

    const invitationsQuery = queryClient
      .getQueryCache()
      .find({ queryKey: qk.listInvitations({ event_id: `eq.${EVENT_ID}` }) });
    const attendeesQuery = queryClient.getQueryCache().find({
      queryKey: [...qk.listAttendeesPrefix(), { event_id: `eq.${EVENT_ID}` }],
    });

    expect(invitationsQuery?.observers[0]?.options.refetchInterval).toBe(
      30_000,
    );
    expect(attendeesQuery?.observers[0]?.options.refetchInterval).toBe(30_000);
  });

  it("queries attendees scoped to the active event ID", async () => {
    setRole("organizer");
    const observedEventFilters: (string | null)[] = [];

    server.use(
      http.get("*/rest/v1/attendees", ({ request }) => {
        const url = new URL(request.url);
        observedEventFilters.push(url.searchParams.get("event_id"));
        return HttpResponse.json([]);
      }),
    );

    renderAttendanceTab();

    expect(
      await screen.findByText(
        "No attendees yet — approvals will populate this view",
      ),
    ).toBeInTheDocument();
    expect(observedEventFilters).toContain(`eq.${EVENT_ID}`);
  });
});

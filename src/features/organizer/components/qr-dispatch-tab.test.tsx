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
import { QrDispatchTab } from "./qr-dispatch-tab";

const EVENT_ID = "55555555-5555-5555-5555-555555555555";
const FOREIGN_EVENT_ID = "99999999-9999-9999-9999-999999999999";
const ACTIVE_INVITATION_ID = "66666666-6666-6666-6666-666666666666";
const FOREIGN_INVITATION_ID = "12121212-3434-5656-7878-909090909090";

function renderQrDispatchTab(eventId = EVENT_ID) {
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
        <QrDispatchTab eventId={eventId} />
      </QueryClientProvider>,
    ),
  };
}

describe("QrDispatchTab", () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    cleanup();
    resetMockOrganizerState();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("renders only approved invitations for the current event when foreign events exist", async () => {
    setRole("organizer");
    const observedEventFilters: (string | null)[] = [];
    const dispatchedBodies: unknown[] = [];

    const allInvitations = [
      {
        id: ACTIVE_INVITATION_ID,
        event_id: EVENT_ID,
        guest_id: "33333333-3333-3333-3333-333333333333",
        status: "accepted" as const,
        max_party_size: 4,
        party_size: 2,
        checked_in_count: 0,
        dietary_preference: "Vegetarian",
        special_requests: null,
        invited_by: "11111111-1111-1111-1111-111111111111",
        invited_at: "2026-10-01T09:00:00+08:00",
        responded_at: "2026-10-05T14:30:00+08:00",
        waitlisted_at: null,
        created_at: "2026-10-01T09:00:00+08:00",
        updated_at: "2026-10-05T14:30:00+08:00",
      },
      {
        id: FOREIGN_INVITATION_ID,
        event_id: FOREIGN_EVENT_ID,
        guest_id: "44444444-5555-6666-7777-888888888888",
        status: "accepted" as const,
        max_party_size: 3,
        party_size: 3,
        checked_in_count: 0,
        dietary_preference: null,
        special_requests: null,
        invited_by: "11111111-1111-1111-1111-111111111111",
        invited_at: "2026-10-01T09:00:00+08:00",
        responded_at: "2026-10-05T14:30:00+08:00",
        waitlisted_at: null,
        created_at: "2026-10-01T09:00:00+08:00",
        updated_at: "2026-10-05T14:30:00+08:00",
      },
    ];

    server.use(
      http.get("*/rest/v1/invitations", ({ request }) => {
        const url = new URL(request.url);
        const filter = url.searchParams.get("event_id");
        observedEventFilters.push(filter);

        if (!filter || !filter.startsWith("eq.")) {
          return HttpResponse.json(allInvitations);
        }

        const targetEventId = filter.slice(3);
        return HttpResponse.json(
          allInvitations.filter((inv) => inv.event_id === targetEventId),
        );
      }),
      http.post("*/functions/v1/qr-bundle", async ({ request }) => {
        dispatchedBodies.push(await request.json());
        return HttpResponse.json({
          dispatched_count: 1,
          invitation_ids: [ACTIVE_INVITATION_ID],
        });
      }),
    );

    const user = userEvent.setup();
    renderQrDispatchTab(EVENT_ID);

    expect(
      await screen.findByText(ACTIVE_INVITATION_ID.slice(0, 8)),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(FOREIGN_INVITATION_ID.slice(0, 8)),
    ).not.toBeInTheDocument();
    expect(observedEventFilters).toContain(`eq.${EVENT_ID}`);

    await user.click(
      screen.getByRole("checkbox", {
        name: /select all approved invitations/i,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: /dispatch qr \(1\)/i }),
    );

    await waitFor(() => {
      expect(dispatchedBodies).toEqual([
        { invitation_id: ACTIVE_INVITATION_ID },
      ]);
    });
  });
});

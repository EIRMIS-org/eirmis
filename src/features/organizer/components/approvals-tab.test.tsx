// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  type Attendee,
  type HeadcountIncreaseRequest,
  setRole,
  eq,
} from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { resetMockOrganizerState } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { ApprovalsTab } from "./approvals-tab";

const EVENT_ID = "55555555-5555-5555-5555-555555555555";
const ATTENDEE_ID = "77777777-7777-7777-7777-777777777777";

function renderApprovalsTab(capacity = 500) {
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
        <ApprovalsTab eventId={EVENT_ID} capacity={capacity} />
      </QueryClientProvider>,
    ),
  };
}

describe("ApprovalsTab waitlist promotion", () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    cleanup();
    resetMockOrganizerState();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("displays waitlisted invitations and promotes on confirmation", async () => {
    setRole("organizer");
    const user = userEvent.setup();
    renderApprovalsTab();

    expect(await screen.findByText("waitlisted")).toBeInTheDocument();
    expect(screen.getByText(/\/500 approved/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /promote from waitlist/i }),
    );
    expect(
      screen.getByRole("button", { name: /confirm promotion/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /confirm promotion/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "No invitations are currently on the waitlist for this event.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("patches attendees and headcount requests query caches on decision", async () => {
    setRole("organizer");
    const user = userEvent.setup();
    const { queryClient } = renderApprovalsTab();

    await screen.findByText("Maria Santos");
    await screen.findByText("+2 additional heads");

    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    // First Reject button belongs to attendee Maria Santos
    await user.click(rejectButtons[0]);

    await waitFor(() => {
      // Attendees are now queried via invitation_id=in.(...) not event_id
      const queryCache = queryClient.getQueryCache()
      const attendeesQueries = queryCache.findAll({
        queryKey: [...qk.listAttendeesPrefix()],
      })
      const attendeesQuery = attendeesQueries.find(q =>
        (q.queryKey[1] as Record<string, unknown> | undefined)?.invitation_id?.toString().startsWith("in.(")
      )
      const cachedAttendees = attendeesQuery?.state?.data as Attendee[] | undefined
      expect(cachedAttendees?.[0]?.status).toBe("rejected");
    });

    // Second Approve button belongs to the headcount request
    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[1]);

    // After approval the request is no longer pending: the status=eq.pending
    // query refetches and the approved request drops out of the cached list.
    await waitFor(() => {
      expect(
        screen.getByText(
          "No headcount requests are pending for this event.",
        ),
      ).toBeInTheDocument();
    });

    const headcountQueries = queryClient
      .getQueryCache()
      .findAll({ queryKey: [...qk.listHeadcountRequestsPrefix()] });
    const pendingQuery = headcountQueries.find(
      (q) =>
        (q.queryKey[1] as Record<string, unknown> | undefined)?.status ===
        "eq.pending",
    );
    const cachedHeadcount = pendingQuery?.state?.data as
      | HeadcountIncreaseRequest[]
      | undefined;
    expect(
      cachedHeadcount?.some((request) => request.status === "pending"),
    ).toBe(false);
  });

  it("disables confirm override button until non-empty reason is entered", async () => {
    setRole("organizer");
    const user = userEvent.setup();
    renderApprovalsTab(0);

    await screen.findByText("Maria Santos");

    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]);

    expect(
      await screen.findByText("Capacity override confirmation"),
    ).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", {
      name: /confirm override/i,
    });
    expect(confirmButton).toBeDisabled();

    const reasonInput = screen.getByLabelText(/override reason/i);
    await user.type(reasonInput, "   ");
    expect(confirmButton).toBeDisabled();

    await user.clear(reasonInput);
    await user.type(reasonInput, "VIP keynote speaker override");
    expect(confirmButton).toBeEnabled();
  });

  it("submits override_capacity: true and reason when override is confirmed", async () => {
    setRole("organizer");
    const submittedPayloads: Array<{
      id: string;
      body: Record<string, unknown>;
    }> = [];

    server.use(
      http.post(
        "*/functions/v1/attendees/:id/decision",
        async ({ request, params }) => {
          const body = (await request.json()) as Record<string, unknown>;
          const id = String(params.id ?? ATTENDEE_ID);
          submittedPayloads.push({ id, body });

          return HttpResponse.json({
            attendee: {
              id,
              invitation_id: "66666666-6666-6666-6666-666666666666",
              full_name: "Maria Santos",
              email: "maria.santos@example.com",
              is_primary: true,
              status: "approved",
              submitted_at: "2026-10-05T14:00:00+08:00",
              reviewed_by: "11111111-1111-1111-1111-111111111111",
              reviewed_at: "2026-10-06T09:00:00+08:00",
              review_reason: String(body.reason ?? ""),
              qr_token: "signed-qr-token-sample",
              checked_in: false,
              checked_in_at: null,
              checked_in_by: null,
              is_walk_in: false,
            },
            capacity_warning: true,
          });
        },
      ),
    );

    const user = userEvent.setup();
    renderApprovalsTab(0);

    await screen.findByText("Maria Santos");

    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]);

    const reasonInput = await screen.findByLabelText(/override reason/i);
    await user.type(reasonInput, "  Executive sponsor seat approved  ");

    await user.click(
      screen.getByRole("button", { name: /confirm override/i }),
    );

    await waitFor(() => {
      expect(submittedPayloads).toEqual([
        {
          id: ATTENDEE_ID,
          body: {
            decision: "approve",
            override_capacity: true,
            reason: "Executive sponsor seat approved",
          },
        },
      ]);
    });
  });

  it("submits normal approval with override_capacity omitted or false", async () => {
    setRole("organizer");
    const submittedBodies: Array<Record<string, unknown>> = [];

    server.use(
      http.post(
        "*/functions/v1/attendees/:id/decision",
        async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          submittedBodies.push(body);
          return HttpResponse.json({
            attendee: {
              id: ATTENDEE_ID,
              invitation_id: "66666666-6666-6666-6666-666666666666",
              full_name: "Maria Santos",
              email: "maria.santos@example.com",
              is_primary: true,
              status: "approved",
              submitted_at: "2026-10-05T14:00:00+08:00",
              reviewed_by: "11111111-1111-1111-1111-111111111111",
              reviewed_at: "2026-10-06T09:00:00+08:00",
              review_reason: null,
              qr_token: "signed-qr-token-sample",
              checked_in: false,
              checked_in_at: null,
              checked_in_by: null,
              is_walk_in: false,
            },
            capacity_warning: false,
          });
        },
      ),
    );

    const user = userEvent.setup();
    renderApprovalsTab(500);

    await screen.findByText("Maria Santos");

    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]);

    await waitFor(() => {
      expect(submittedBodies).toHaveLength(1);
    });

    expect(submittedBodies[0]?.decision).toBe("approve");
    expect(Boolean(submittedBodies[0]?.override_capacity)).toBe(false);
  });

  it("opens capacity override dialog when initial approval returns 409 CAPACITY_EXCEEDED", async () => {
    setRole("organizer");
    let callCount = 0;
    const submittedBodies: Array<Record<string, unknown>> = [];

    server.use(
      http.post(
        "*/functions/v1/attendees/:id/decision",
        async ({ request }) => {
          callCount += 1;
          const body = (await request.json()) as Record<string, unknown>;
          submittedBodies.push(body);

          if (callCount === 1) {
            return HttpResponse.json(
              {
                code: "CAPACITY_EXCEEDED",
                message:
                  "Event capacity has been reached. An explicit organizer override is required.",
                details: null,
                hint: null,
              },
              { status: 409 },
            );
          }

          return HttpResponse.json({
            attendee: {
              id: ATTENDEE_ID,
              invitation_id: "66666666-6666-6666-6666-666666666666",
              full_name: "Maria Santos",
              email: "maria.santos@example.com",
              is_primary: true,
              status: "approved",
              submitted_at: "2026-10-05T14:00:00+08:00",
              reviewed_by: "11111111-1111-1111-1111-111111111111",
              reviewed_at: "2026-10-06T09:00:00+08:00",
              review_reason: String(body.reason ?? ""),
              qr_token: "signed-qr-token-sample",
              checked_in: false,
              checked_in_at: null,
              checked_in_by: null,
              is_walk_in: false,
            },
            capacity_warning: true,
          });
        },
      ),
    );

    const user = userEvent.setup();
    renderApprovalsTab(500);

    await screen.findByText("Maria Santos");

    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]);

    expect(
      await screen.findByText("Capacity override confirmation"),
    ).toBeInTheDocument();

    const reasonInput = screen.getByLabelText(/override reason/i);
    await user.type(reasonInput, "Approved after concurrent capacity fill");

    await user.click(
      screen.getByRole("button", { name: /confirm override/i }),
    );

    await waitFor(() => {
      expect(submittedBodies).toHaveLength(2);
    });
    expect(submittedBodies[1]).toEqual({
      decision: "approve",
      override_capacity: true,
      reason: "Approved after concurrent capacity fill",
    });
  });
});

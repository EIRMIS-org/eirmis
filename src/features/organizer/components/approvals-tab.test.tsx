// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  type Attendee,
  type HeadcountIncreaseRequest,
  setRole,
} from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { resetMockOrganizerState } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { ApprovalsTab } from "./approvals-tab";

const EVENT_ID = "55555555-5555-5555-5555-555555555555";

function renderApprovalsTab() {
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
        <ApprovalsTab eventId={EVENT_ID} capacity={500} />
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
      const cachedAttendees = queryClient.getQueryData<Attendee[]>(
        qk.listAttendees(undefined),
      );
      expect(cachedAttendees?.[0]?.status).toBe("rejected");
    });

    // Second Approve button belongs to the headcount request
    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[1]);

    await waitFor(() => {
      const cachedHeadcount = queryClient.getQueryData<
        HeadcountIncreaseRequest[]
      >(qk.listHeadcountRequests({ status: "pending" }));
      expect(cachedHeadcount?.[0]?.status).toBe("approved");
    });
  });
});

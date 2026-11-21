// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setRole } from "@/lib/api";
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

  return render(
    <QueryClientProvider client={queryClient}>
      <ApprovalsTab eventId={EVENT_ID} capacity={500} />
    </QueryClientProvider>,
  );
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
});

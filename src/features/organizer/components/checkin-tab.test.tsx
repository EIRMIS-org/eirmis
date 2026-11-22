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
import { CheckInTab } from "./checkin-tab";

const EVENT_ID = "55555555-5555-5555-5555-555555555555";

function renderCheckInTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CheckInTab eventId={EVENT_ID} />
    </QueryClientProvider>,
  );
}

describe("CheckInTab", () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    cleanup();
    resetMockOrganizerState();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("renders loading skeleton then check-in assignments", async () => {
    setRole("organizer");
    renderCheckInTab();

    expect(
      screen.getByLabelText("Loading check-in assignments"),
    ).toBeInTheDocument();

    expect(await screen.findByText("staff@example.com")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders error state with retry and empty state", async () => {
    setRole("organizer");
    let failOnce = true;
    server.use(
      http.get("*/rest/v1/checkin_assignments", () => {
        if (failOnce) {
          failOnce = false;
          return HttpResponse.json(
            { code: "500", message: "Error", details: null, hint: null },
            { status: 500 },
          );
        }
        return HttpResponse.json([]);
      }),
    );

    const user = userEvent.setup();
    renderCheckInTab();

    expect(
      await screen.findByText("Unable to load check-in staff assignments."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(
      await screen.findByText("No check-in staff assigned yet"),
    ).toBeInTheDocument();
  });

  it("creates a new check-in staff assignment and revokes it", async () => {
    setRole("organizer");
    const user = userEvent.setup();
    renderCheckInTab();

    await screen.findByText("staff@example.com");

    await user.click(screen.getByRole("button", { name: /assign staff/i }));
    await user.type(
      screen.getByLabelText(/staff email/i),
      "scanner2@example.com",
    );

    const submitButtons = screen.getAllByRole("button", {
      name: /assign staff/i,
    });
    await user.click(submitButtons[submitButtons.length - 1]);

    expect(await screen.findByText("scanner2@example.com")).toBeInTheDocument();

    const revokeButtons = screen.getAllByRole("button", { name: /revoke/i });
    await user.click(revokeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("revoked")).toBeInTheDocument();
    });
  });
});

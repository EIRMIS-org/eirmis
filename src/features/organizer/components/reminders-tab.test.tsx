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
import { RemindersTab } from "./reminders-tab";

const EVENT_ID = "55555555-5555-5555-5555-555555555555";

function renderRemindersTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RemindersTab eventId={EVENT_ID} />
    </QueryClientProvider>,
  );
}

describe("RemindersTab", () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    cleanup();
    resetMockOrganizerState();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("renders loading skeleton then populated reminder schedules", async () => {
    setRole("organizer");
    renderRemindersTab();

    expect(
      screen.getByLabelText("Loading reminder schedules"),
    ).toBeInTheDocument();

    expect(await screen.findByText("7 days before")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
  });

  it("renders error state with retry and recovers on retry", async () => {
    setRole("organizer");
    let failOnce = true;
    server.use(
      http.get("*/rest/v1/reminder_schedules", () => {
        if (failOnce) {
          failOnce = false;
          return HttpResponse.json(
            { code: "500", message: "Server error", details: null, hint: null },
            { status: 500 },
          );
        }
        return HttpResponse.json([]);
      }),
    );

    const user = userEvent.setup();
    renderRemindersTab();

    expect(
      await screen.findByText("Unable to load reminder schedules."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(
      await screen.findByText("No reminder schedules configured yet"),
    ).toBeInTheDocument();
  });

  it("creates a new reminder schedule and updates the list", async () => {
    setRole("organizer");
    const user = userEvent.setup();
    renderRemindersTab();

    await screen.findByText("7 days before");

    await user.click(screen.getByRole("button", { name: /add schedule/i }));

    const daysInput = screen.getByLabelText(/days before event/i);
    await user.clear(daysInput);
    await user.type(daysInput, "3");

    const timeInput = screen.getByLabelText(/send time/i);
    await user.clear(timeInput);
    await user.type(timeInput, "10:30");

    await user.click(screen.getByRole("button", { name: /save schedule/i }));

    await waitFor(() => {
      expect(screen.getByText("3 days before")).toBeInTheDocument();
      expect(screen.getByText("10:30")).toBeInTheDocument();
    });
  });
});

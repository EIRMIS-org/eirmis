// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setRole } from "@/lib/api";
import { resetMockOrganizerState } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { EventWorkspacePage } from "./event-workspace-page";

const EVENT_ID = "55555555-5555-5555-5555-555555555555";

function renderWorkspace(initialUrl = `/organizer/events/${EVENT_ID}`) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route
            path="/organizer/events/:eventId"
            element={<EventWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EventWorkspacePage", () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    cleanup();
    resetMockOrganizerState();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("renders real event data in the workspace header", async () => {
    setRole("organizer");
    renderWorkspace();

    expect(await screen.findByText("Annual Gala 2026")).toBeInTheDocument();
    expect(screen.getByText("published")).toBeInTheDocument();
    expect(screen.getByText("Capacity 500")).toBeInTheDocument();
    expect(screen.getByText("Asia/Manila")).toBeInTheDocument();
    expect(await screen.findByText("2 invited")).toBeInTheDocument();
  });

  it("edits event title via dialog and updates workspace header immediately", async () => {
    setRole("organizer");
    const user = userEvent.setup();
    renderWorkspace();

    await screen.findByText("Annual Gala 2026");

    await user.click(screen.getByRole("button", { name: /edit event/i }));
    const titleInput = screen.getByLabelText(/event title/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Annual Gala 2026 Updated");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Annual Gala 2026 Updated"),
      ).toBeInTheDocument();
    });
  });

  it("respects URL ?tab=reminders query parameter", async () => {
    setRole("organizer");
    renderWorkspace(`/organizer/events/${EVENT_ID}?tab=reminders`);

    expect(await screen.findByText("Reminder schedules")).toBeInTheDocument();
  });

  it("reaches the attendance dashboard tab via ?tab=attendance", async () => {
    setRole("organizer");
    renderWorkspace(`/organizer/events/${EVENT_ID}?tab=attendance`);

    expect(await screen.findByText("Check-in feed")).toBeInTheDocument();
    expect(
      await screen.findByTestId("attendance-expected-count"),
    ).toHaveTextContent("2");
  });
});

// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { CreateEventPage } from "./create-event-page";

function renderWizard(initialEntry = "/organizer/events/new") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/organizer" element={<div>Organizer Events List</div>} />
          <Route path="/organizer/events/new" element={<CreateEventPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CreateEventPage dirty-guard", () => {
  afterEach(() => {
    cleanup();
  });

  it("prevents default on beforeunload while the wizard has dirty fields", async () => {
    const user = userEvent.setup();
    renderWizard();

    const cleanUnloadEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(cleanUnloadEvent);
    expect(cleanUnloadEvent.defaultPrevented).toBe(false);

    const titleInput = screen.getByLabelText(/event title/i);
    await user.type(titleInput, "Tech Summit 2027");

    expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();

    const dirtyUnloadEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirtyUnloadEvent);
    expect(dirtyUnloadEvent.defaultPrevented).toBe(true);
  });

  it("guards Back and step navigation with a confirmation dialog when dirty", async () => {
    const user = userEvent.setup();
    renderWizard("/organizer/events/new?step=2");

    const venueInput = screen.getByLabelText(/venue/i);
    await user.type(venueInput, "Cebu Convention Center");

    await user.click(screen.getByRole("button", { name: /previous/i }));

    expect(
      screen.getByText("Leave with unsaved changes?"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continue to step/i }));

    expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
  });
});

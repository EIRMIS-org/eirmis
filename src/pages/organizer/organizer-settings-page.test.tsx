// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setRole } from "@/lib/api";
import { resetMockOrganizerState } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { OrganizerSettingsPage } from "./organizer-settings-page";

function renderSettingsPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OrganizerSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("OrganizerSettingsPage", () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    cleanup();
    resetMockOrganizerState();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("loads organizer profile and updates display name", async () => {
    setRole("organizer");
    const user = userEvent.setup();
    renderSettingsPage();

    const nameInput = await screen.findByLabelText(/display name/i);
    expect(nameInput).toHaveValue("Jomari Barrera");

    await user.clear(nameInput);
    await user.type(nameInput, "Jomari Joseph Barrera");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue(
        "Jomari Joseph Barrera",
      );
    });
  });

  it("shows error state with retry on failure", async () => {
    setRole("organizer");
    let failOnce = true;
    server.use(
      http.get("*/rest/v1/organizer_profiles", () => {
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
    renderSettingsPage();

    expect(
      await screen.findByText("Unable to load your organizer profile."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(
      await screen.findByText(
        "No organizer profile record was found for this account.",
      ),
    ).toBeInTheDocument();
  });
});

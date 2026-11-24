// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { SessionCacheGuard } from "@/App";
import { SessionProvider } from "@/app/providers/session-context";
import { useSession } from "@/app/providers/use-session";
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

  it("warns on beforeunload and displays unsaved changes indicator while dirty", async () => {
    setRole("organizer");
    const user = userEvent.setup();
    renderSettingsPage();

    const nameInput = await screen.findByLabelText(/display name/i);
    await user.type(nameInput, " Jr.");

    expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();

    const unloadEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unloadEvent);
    expect(unloadEvent.defaultPrevented).toBe(true);
  });

  it("clears the query cache when signing out to public role", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["organizer-secret"], { count: 42 });

    function SignOutHarness() {
      const { role, signIn, signOut } = useSession();
      return (
        <div>
          <span data-testid="active-role">{role}</span>
          <button type="button" onClick={() => signIn("organizer")}>
            Sign in organizer
          </button>
          <button type="button" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      );
    }

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <SessionCacheGuard />
          <SignOutHarness />
        </SessionProvider>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: /sign in organizer/i }));
    expect(screen.getByTestId("active-role")).toHaveTextContent("organizer");
    expect(queryClient.getQueryData(["organizer-secret"])).toEqual({
      count: 42,
    });

    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(screen.getByTestId("active-role")).toHaveTextContent("public");
    expect(queryClient.getQueryData(["organizer-secret"])).toBeUndefined();
  });
});

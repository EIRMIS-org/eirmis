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
import { InvitationDesignTab } from "./invitation-design-tab";

const EVENT_ID = "55555555-5555-5555-5555-555555555555";

function renderDesignTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <InvitationDesignTab eventId={EVENT_ID} />
    </QueryClientProvider>,
  );
}

describe("InvitationDesignTab", () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    cleanup();
    resetMockOrganizerState();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("renders loading skeletons then current design and gallery images", async () => {
    setRole("organizer");
    renderDesignTab();

    expect(
      screen.getByLabelText("Loading invitation design"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Loading gallery images")).toBeInTheDocument();

    expect(
      await screen.findByText(`designs/${EVENT_ID}/invitation.html`),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Welcome to the Annual Gala"),
    ).toBeInTheDocument();
  });

  it("renders error state with retry and empty state", async () => {
    setRole("organizer");
    let failOnce = true;
    server.use(
      http.get("*/rest/v1/invitation_images", () => {
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
    renderDesignTab();

    expect(
      await screen.findByText("Unable to load gallery images."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(
      await screen.findByText("No gallery images added yet"),
    ).toBeInTheDocument();
  });

  it("adds a gallery image and renders it in the table", async () => {
    setRole("organizer");
    const user = userEvent.setup();
    renderDesignTab();

    await screen.findByText("Welcome to the Annual Gala");

    await user.click(screen.getByRole("button", { name: /^add image$/i }));

    await user.type(
      screen.getByLabelText(/storage path/i),
      `designs/${EVENT_ID}/gallery/003.jpg`,
    );
    await user.type(screen.getByLabelText(/caption/i), "Stage lighting");

    const dialogSubmit = screen
      .getAllByRole("button", { name: /^add image$/i })
      .at(-1)!;
    await user.click(dialogSubmit);

    await waitFor(() => {
      expect(screen.getByText("Stage lighting")).toBeInTheDocument();
    });
  });
});

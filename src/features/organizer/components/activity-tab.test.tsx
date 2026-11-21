// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setRole } from "@/lib/api";
import { resetMockOrganizerState } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { ActivityTab } from "./activity-tab";

const EVENT_ID = "55555555-5555-5555-5555-555555555555";

function renderActivityTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ActivityTab eventId={EVENT_ID} />
    </QueryClientProvider>,
  );
}

describe("ActivityTab", () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    cleanup();
    resetMockOrganizerState();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("renders loading skeletons then email logs and audit trail", async () => {
    setRole("organizer");
    renderActivityTab();

    expect(screen.getByLabelText("Loading email logs")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Loading audit log entries"),
    ).toBeInTheDocument();

    expect(await screen.findByText("guest@example.com")).toBeInTheDocument();
    expect(screen.getByText("rsvp_confirmation")).toBeInTheDocument();
    expect(await screen.findByText("attendee.approved")).toBeInTheDocument();
    expect(screen.getByText("Verified team member")).toBeInTheDocument();
  });

  it("renders error states with retry and empty states", async () => {
    setRole("organizer");
    let failEmail = true;
    let failAudit = true;

    server.use(
      http.get("*/rest/v1/email_logs", () => {
        if (failEmail) {
          failEmail = false;
          return HttpResponse.json(
            { code: "500", message: "Error", details: null, hint: null },
            { status: 500 },
          );
        }
        return HttpResponse.json([]);
      }),
      http.get("*/rest/v1/audit_log_entries", () => {
        if (failAudit) {
          failAudit = false;
          return HttpResponse.json(
            { code: "500", message: "Error", details: null, hint: null },
            { status: 500 },
          );
        }
        return HttpResponse.json([]);
      }),
    );

    const user = userEvent.setup();
    renderActivityTab();

    expect(
      await screen.findByText("Unable to load email delivery logs."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Unable to load audit log entries."),
    ).toBeInTheDocument();

    const retryButtons = screen.getAllByRole("button", { name: /retry/i });
    await user.click(retryButtons[0]);
    await user.click(retryButtons[1]);

    expect(
      await screen.findByText("No emails sent for this event yet"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("No audit log entries recorded yet"),
    ).toBeInTheDocument();
  });
});

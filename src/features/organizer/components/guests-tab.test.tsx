// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { type Invitation, setRole } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import * as csvExport from "@/lib/csv-export";
import { resetMockOrganizerState } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { GuestsTab } from "./guests-tab";

const EVENT_ID = "55555555-5555-5555-5555-555555555555";
const GUEST_1_UUID = "33333333-3333-3333-3333-333333333333";
const GUEST_2_UUID = "33333333-3333-3333-3333-333333333334";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderGuestsTab(queryClient = createTestQueryClient()) {
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <GuestsTab eventId={EVENT_ID} />
      </QueryClientProvider>,
    ),
  };
}

describe("GuestsTab", () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    resetMockOrganizerState();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("renders the guest roster and add-invitation action", () => {
    setRole("organizer");
    renderGuestsTab();

    expect(screen.getByText("Guest roster")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add invitation/i }),
    ).toBeInTheDocument();
  });

  it("renders real guest names and status badges without raw guest UUIDs", async () => {
    setRole("organizer");
    const { container } = renderGuestsTab();

    expect(await screen.findAllByText("Jordan Cruz")).toHaveLength(2);
    expect(screen.getAllByText("Jose Rizal")).toHaveLength(2);
    expect(screen.getByText("jordan.cruz@example.com")).toBeInTheDocument();
    expect(screen.getByText("waitlist.guest@example.com")).toBeInTheDocument();

    expect(screen.queryByText(GUEST_1_UUID)).not.toBeInTheDocument();
    expect(screen.queryByText(GUEST_2_UUID)).not.toBeInTheDocument();

    const acceptedBadges = container.querySelectorAll(
      '[data-slot="badge"]',
    );
    const badgeTexts = Array.from(acceptedBadges).map((el) => el.textContent);
    expect(badgeTexts).toContain("accepted");
    expect(badgeTexts).toContain("waitlisted");
  });

  it("filters guests by name or email and updates matching count", async () => {
    setRole("organizer");
    const user = userEvent.setup();
    renderGuestsTab();

    await screen.findAllByText("Jordan Cruz");
    expect(screen.getByText("2 guests")).toBeInTheDocument();

    const searchInput = screen.getByRole("searchbox", {
      name: /search guests by name or email/i,
    });
    await user.type(searchInput, "rizal");

    expect(screen.getByText("2 guests (1 matching)")).toBeInTheDocument();
    expect(screen.queryByText("Jordan Cruz")).not.toBeInTheDocument();
    expect(screen.getAllByText("Jose Rizal")).toHaveLength(2);
  });

  it("invokes CSV export with guest name, email, status, and max party", async () => {
    setRole("organizer");
    const user = userEvent.setup();
    const downloadSpy = vi
      .spyOn(csvExport, "downloadCSV")
      .mockImplementation(() => {});

    renderGuestsTab();

    await screen.findAllByText("Jordan Cruz");

    const exportButton = screen.getByRole("button", { name: /export csv/i });
    expect(exportButton).toBeEnabled();
    await user.click(exportButton);

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(downloadSpy).toHaveBeenCalledWith(
      `event-${EVENT_ID}-guests`,
      ["Name", "Email", "Status", "Max party"],
      [
        ["Jordan Cruz", "jordan.cruz@example.com", "accepted", 4],
        ["Jose Rizal", "waitlist.guest@example.com", "waitlisted", 2],
      ],
    );
  });

  it("patches the invitations query cache when an invitation is edited", async () => {
    setRole("organizer");
    const user = userEvent.setup();
    const { queryClient } = renderGuestsTab();

    await screen.findAllByText("Jordan Cruz");

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    const partySizeInput = screen.getByLabelText(/max party size/i);
    await user.clear(partySizeInput);
    await user.type(partySizeInput, "6");
    await user.click(screen.getByRole("button", { name: /save invitation/i }));

    await waitFor(() => {
      const cached = queryClient.getQueryData<Invitation[]>(
        qk.listInvitations({ event_id: `eq.${EVENT_ID}` }),
      );
      expect(cached?.[0]?.max_party_size).toBe(6);
    });
  });
});

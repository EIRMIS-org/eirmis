// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { listReminderSchedules, setRole, updateReminderSchedule } from "@/lib/api";
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
    server.events.removeAllListeners();
    vi.restoreAllMocks();
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
    const posts: Request[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method === "POST") posts.push(request);
    });
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
    expect(posts).toHaveLength(1);
    expect(posts[0].headers.get("Prefer")).toBe("resolution=merge-duplicates,return=representation");
    expect(new URL(posts[0].url).searchParams.get("on_conflict")).toBe("event_id,days_before_event");
  });

  it("saves a seconds-format reminder untouched, then edits its time and day by ID", async () => {
    setRole("organizer");
    const [original] = await listReminderSchedules(EVENT_ID);
    await updateReminderSchedule(original.id, { send_time_of_day: "09:00:15" });
    const before = await listReminderSchedules(EVENT_ID);
    const patches: Request[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method === "PATCH") patches.push(request);
    });
    const user = userEvent.setup();
    renderRemindersTab();
    await screen.findByText("7 days before");
    const edit = async (label: string) => {
      const row = screen.getByText(label).closest("tr")!;
      await user.click(within(row).getByRole("button", { name: "Edit" }));
    };
    await edit("7 days before");
    expect(screen.getByLabelText(/send time/i)).toHaveValue("09:00:15");
    await user.click(screen.getByRole("button", { name: /save schedule/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await listReminderSchedules(EVENT_ID)).toEqual(before);

    await edit("7 days before");
    await user.clear(screen.getByLabelText(/send time/i));
    await user.type(screen.getByLabelText(/send time/i), "10:30:45");
    await user.click(screen.getByRole("button", { name: /save schedule/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await edit("7 days before");
    const days = screen.getByLabelText(/days before event/i);
    expect(days).toHaveAttribute("min", "1");
    expect(days).not.toHaveAttribute("readonly");
    await user.clear(days);
    await user.type(days, "4");
    await user.click(screen.getByRole("button", { name: /save schedule/i }));
    await screen.findByText("4 days before");
    expect(screen.queryByText("7 days before")).not.toBeInTheDocument();
    expect(await listReminderSchedules(EVENT_ID)).toEqual([
      { ...before[0], days_before_event: 4, send_time_of_day: "10:30:45" }, ...before.slice(1),
    ]);
    expect(patches).toHaveLength(3);
    for (const request of patches) {
      expect(new URL(request.url).searchParams.get("id")).toBe(`eq.${original.id}`);
      expect(request.headers.get("Prefer")).toBe("return=representation");
    }
  });

  it("rejects zero days and keeps conflicting edits open without changing data", async () => {
    setRole("organizer");
    const errorToast = vi.spyOn(toast, "error");
    const before = await listReminderSchedules(EVENT_ID);
    const user = userEvent.setup();
    renderRemindersTab();
    const row = (await screen.findByText("7 days before")).closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    const days = screen.getByLabelText(/days before event/i);
    await user.clear(days);
    await user.type(days, "0");
    await user.click(screen.getByRole("button", { name: /save schedule/i }));
    expect(await screen.findByText("Days before event must be 1 or greater")).toBeInTheDocument();
    await user.clear(days);
    await user.type(days, "1");
    await user.click(screen.getByRole("button", { name: /save schedule/i }));
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith("A reminder already exists for this day.", expect.anything()));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(await listReminderSchedules(EVENT_ID)).toEqual(before);
  });

  it("creates and repeatedly edits the same row through the dialog", async () => {
    setRole("organizer");
    const before = await listReminderSchedules(EVENT_ID);
    const user = userEvent.setup();
    renderRemindersTab();
    await screen.findByText("7 days before");
    await user.click(screen.getByRole("button", { name: /add schedule/i }));
    await user.click(screen.getByRole("button", { name: /save schedule/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const created = (await listReminderSchedules(EVENT_ID)).find((row) => row.days_before_event === 3)!;
    expect(created).toBeDefined();
    for (const [field, value] of [[/send time/i, "11:45:30"], [/days before event/i, "5"]] as const) {
      const row = screen.getByText("3 days before").closest("tr")!;
      await user.click(within(row).getByRole("button", { name: "Edit" }));
      await user.clear(screen.getByLabelText(field));
      await user.type(screen.getByLabelText(field), value);
      await user.click(screen.getByRole("button", { name: /save schedule/i }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(await listReminderSchedules(EVENT_ID)).toHaveLength(before.length + 1);
    }
    expect(await listReminderSchedules(EVENT_ID)).toEqual([
      ...before, { ...created, days_before_event: 5, send_time_of_day: "11:45:30" },
    ]);
    expect(screen.getByText("5 days before")).toBeInTheDocument();
    expect(screen.queryByText("3 days before")).not.toBeInTheDocument();
  });
});

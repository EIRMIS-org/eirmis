// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { setRole } from "@/lib/api";
import { resetMockOrganizerState } from "@/mocks/handlers";
import { server } from "@/mocks/server";
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
  beforeAll(() => server.listen());

  afterEach(() => {
    cleanup();
    resetMockOrganizerState();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
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

  it("transitions between wizard steps without modal when previous steps are dirty", async () => {
    const user = userEvent.setup();
    renderWizard();

    const titleInput = screen.getByLabelText(/event title/i);
    const slugInput = screen.getByLabelText(/event slug/i);
    fireEvent.change(titleInput, { target: { value: "Tech Summit 2027" } });
    fireEvent.change(slugInput, { target: { value: "tech-summit-2027" } });
    await user.click(
      screen.getByRole("button", { name: /go to schedule step/i }),
    );

    expect(screen.getByLabelText(/starts/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByLabelText(/event title/i)).toHaveValue("Tech Summit 2027");
    expect(screen.getByLabelText(/event slug/i)).toHaveValue("tech-summit-2027");
    expect(screen.queryByText("Leave with unsaved changes?")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /go to schedule step/i }),
    );
    fireEvent.change(screen.getByLabelText(/^starts/i), {
      target: { value: "2026-12-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText(/^ends/i), {
      target: { value: "2026-12-01T20:00" },
    });
    fireEvent.change(screen.getByLabelText(/rsvp deadline/i), {
      target: { value: "2026-12-01T17:00" },
    });
    await user.click(
      screen.getByRole("button", { name: /go to capacity & rules step/i }),
    );

    expect(screen.getByLabelText(/total capacity/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByLabelText(/^starts/i)).toHaveValue("2026-12-01T18:00");
    expect(
      screen.queryByText("Leave with unsaved changes?"),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /go to basics step/i }),
    );

    expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/event title/i)).toHaveValue("Tech Summit 2027");
    expect(screen.getByLabelText(/event slug/i)).toHaveValue("tech-summit-2027");
    expect(
      screen.queryByText("Leave with unsaved changes?"),
    ).not.toBeInTheDocument();
  });

  it("prompts confirmation when leaving wizard with unsaved changes", async () => {
    const user = userEvent.setup();
    renderWizard();

    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: "Tech Summit 2027" },
    });
    await user.click(screen.getByRole("button", { name: /back to events/i }));

    expect(
      screen.getByText("Leave with unsaved changes?"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /leave without saving/i }),
    ).toBeInTheDocument();
  });

  it("submits a Manila event with timezone-correct UTC timestamps", async () => {
    const user = userEvent.setup();
    const submittedBody = vi.fn();
    setRole("organizer");
    server.use(
      http.post("*/rest/v1/events", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        submittedBody(body);
        return HttpResponse.json(
          {
            ...body,
            id: "99999999-9999-9999-9999-999999999999",
            organizer_id: "11111111-1111-1111-1111-111111111111",
            created_at: "2026-11-27T00:00:00.000Z",
            updated_at: "2026-11-27T00:00:00.000Z",
          },
          { status: 201 },
        );
      }),
    );
    renderWizard();

    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: "Manila Event" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "manila-event" },
    });
    await user.click(
      screen.getByRole("button", { name: /go to schedule step/i }),
    );
    fireEvent.change(screen.getByLabelText(/^starts/i), {
      target: { value: "2026-12-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText(/^ends/i), {
      target: { value: "2026-12-01T20:00" },
    });
    fireEvent.change(screen.getByLabelText(/rsvp deadline/i), {
      target: { value: "2026-12-01T17:00" },
    });
    const timezoneInput = screen.getByLabelText(/time zone/i);
    fireEvent.change(timezoneInput, { target: { value: "Asia/Manila" } });
    await user.click(
      screen.getByRole("button", { name: /go to capacity & rules step/i }),
    );

    fireEvent.change(screen.getByLabelText(/total capacity/i), {
      target: { value: "100" },
    });
    await user.click(screen.getByRole("button", { name: /go to review step/i }));
    await user.click(screen.getByRole("button", { name: /create event/i }));

    await waitFor(() => {
      expect(submittedBody).toHaveBeenCalled();
    });
    expect(submittedBody.mock.calls[0][0]).toMatchObject({
      event_timezone: "Asia/Manila",
      starts_at: "2026-12-01T10:00:00.000Z",
    });
  });
});

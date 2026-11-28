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
import { createMemoryRouter, RouterProvider } from "react-router-dom";
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

  const router = createMemoryRouter(
    [
      { path: "/organizer", element: <div>Organizer Events List</div> },
      { path: "/organizer/events/new", element: <CreateEventPage /> },
      { path: "/organizer/events/:eventId", element: <div>Event Workspace</div> },
    ],
    { initialEntries: [initialEntry] },
  );

  return {
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
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

    expect(await screen.findByLabelText(/^starts/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(await screen.findByLabelText(/event title/i)).toHaveValue(
      "Tech Summit 2027",
    );
    expect(screen.getByLabelText(/event slug/i)).toHaveValue("tech-summit-2027");
    expect(
      screen.queryByText("Leave with unsaved changes?"),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /go to schedule step/i }),
    );
    fireEvent.change(await screen.findByLabelText(/^starts/i), {
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

    expect(await screen.findByLabelText(/total capacity/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(await screen.findByLabelText(/^starts/i)).toHaveValue(
      "2026-12-01T18:00",
    );
    expect(
      screen.queryByText("Leave with unsaved changes?"),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /go to basics step/i }),
    );

    expect(await screen.findByLabelText(/event title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/event title/i)).toHaveValue(
      "Tech Summit 2027",
    );
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
    fireEvent.change(await screen.findByLabelText(/^starts/i), {
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

    fireEvent.change(await screen.findByLabelText(/total capacity/i), {
      target: { value: "100" },
    });
    await user.click(screen.getByRole("button", { name: /go to review step/i }));
    await user.click(
      await screen.findByRole("button", { name: /create event/i }),
    );

    await waitFor(() => {
      expect(submittedBody).toHaveBeenCalled();
    });
    expect(submittedBody.mock.calls[0][0]).toMatchObject({
      event_timezone: "Asia/Manila",
      starts_at: "2026-12-01T10:00:00.000Z",
    });
  });

  it("blocks Basics -> Review when Basics is empty and displays title and slug errors", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole("button", { name: /go to review step/i }));

    expect(await screen.findByText(/event title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/event slug is required/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /event basics/i })).toBeInTheDocument();
  });

  it("stops on Schedule when Basics is valid but Schedule is invalid", async () => {
    const user = userEvent.setup();
    renderWizard();

    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: "Annual Summit" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "annual-summit" },
    });

    await user.click(screen.getByRole("button", { name: /go to review step/i }));

    expect(
      await screen.findByRole("heading", { name: /schedule and location/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^starts/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/^ends/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/rsvp deadline/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("stops on Capacity when Basics and Schedule are valid but Capacity is invalid", async () => {
    const user = userEvent.setup();
    renderWizard();

    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: "Annual Summit" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "annual-summit" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/^starts/i), {
      target: { value: "2026-12-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText(/^ends/i), {
      target: { value: "2026-12-01T20:00" },
    });
    fireEvent.change(screen.getByLabelText(/rsvp deadline/i), {
      target: { value: "2026-12-01T17:00" },
    });

    await user.click(screen.getByRole("button", { name: /go to review step/i }));

    expect(
      await screen.findByRole("heading", { name: /capacity and registration/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/total capacity/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("allows forward step navigation with valid prerequisites and preserves unrelated query params", async () => {
    const user = userEvent.setup();
    const { router } = renderWizard("/organizer/events/new?source=dashboard&step=1");

    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: "Annual Summit" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "annual-summit" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/^starts/i), {
      target: { value: "2026-12-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText(/^ends/i), {
      target: { value: "2026-12-01T20:00" },
    });
    fireEvent.change(screen.getByLabelText(/rsvp deadline/i), {
      target: { value: "2026-12-01T17:00" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/total capacity/i), {
      target: { value: "250" },
    });
    await user.click(screen.getByRole("button", { name: /go to review step/i }));

    expect(
      await screen.findByRole("heading", { name: /review your event/i }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toContain("source=dashboard");
    expect(router.state.location.search).toContain("step=4");
  });

  it("deep-linking to ?step=4 and clicking Create redirects to Basics with visible errors and zero POST requests", async () => {
    const user = userEvent.setup();
    const submittedBody = vi.fn();
    setRole("organizer");
    server.use(
      http.post("*/rest/v1/events", async ({ request }) => {
        submittedBody(await request.json());
        return HttpResponse.json({}, { status: 201 });
      }),
    );

    renderWizard("/organizer/events/new?step=4");

    expect(
      screen.getByRole("heading", { name: /review your event/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /create event/i }));

    expect(
      await screen.findByRole("heading", { name: /event basics/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/event title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/event slug is required/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText(/event title/i)).toHaveFocus();
    });
    expect(submittedBody).not.toHaveBeenCalled();
  });

  it("pressing Enter in valid Step 3 advances to Review without creating an event", async () => {
    const user = userEvent.setup();
    const submittedBody = vi.fn();
    setRole("organizer");
    server.use(
      http.post("*/rest/v1/events", async ({ request }) => {
        submittedBody(await request.json());
        return HttpResponse.json({}, { status: 201 });
      }),
    );

    renderWizard();

    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: "Enter Key Summit" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "enter-key-summit" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/^starts/i), {
      target: { value: "2026-12-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText(/^ends/i), {
      target: { value: "2026-12-01T20:00" },
    });
    fireEvent.change(screen.getByLabelText(/rsvp deadline/i), {
      target: { value: "2026-12-01T17:00" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    const capacityInput = await screen.findByLabelText(/total capacity/i);
    await user.type(capacityInput, "150{Enter}");

    expect(
      await screen.findByRole("heading", { name: /review your event/i }),
    ).toBeInTheDocument();
    expect(submittedBody).not.toHaveBeenCalled();
  });

  it("pressing Enter in invalid Step 3 remains on Step 3 with visible errors", async () => {
    const user = userEvent.setup();
    const submittedBody = vi.fn();
    setRole("organizer");
    server.use(
      http.post("*/rest/v1/events", async ({ request }) => {
        submittedBody(await request.json());
        return HttpResponse.json({}, { status: 201 });
      }),
    );

    renderWizard();

    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: "Enter Key Summit" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "enter-key-summit" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/^starts/i), {
      target: { value: "2026-12-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText(/^ends/i), {
      target: { value: "2026-12-01T20:00" },
    });
    fireEvent.change(screen.getByLabelText(/rsvp deadline/i), {
      target: { value: "2026-12-01T17:00" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    const capacityInput = await screen.findByLabelText(/total capacity/i);
    await user.click(capacityInput);
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("heading", { name: /capacity and registration/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(capacityInput).toHaveAttribute("aria-invalid", "true");
    });
    expect(submittedBody).not.toHaveBeenCalled();
  });

  it("sends exactly one create request from Review and navigates to the created event", async () => {
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
            id: "event-created-123",
            organizer_id: "11111111-1111-1111-1111-111111111111",
            created_at: "2026-11-27T00:00:00.000Z",
            updated_at: "2026-11-27T00:00:00.000Z",
          },
          { status: 201 },
        );
      }),
    );

    const { router } = renderWizard();

    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: "Created Event" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "created-event" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/^starts/i), {
      target: { value: "2026-12-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText(/^ends/i), {
      target: { value: "2026-12-01T20:00" },
    });
    fireEvent.change(screen.getByLabelText(/rsvp deadline/i), {
      target: { value: "2026-12-01T17:00" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/total capacity/i), {
      target: { value: "120" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.click(
      await screen.findByRole("button", { name: /create event/i }),
    );

    expect(await screen.findByText("Event Workspace")).toBeInTheDocument();
    expect(submittedBody).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe(
      "/organizer/events/event-created-123",
    );
    expect(
      screen.queryByText("Leave with unsaved changes?"),
    ).not.toBeInTheDocument();
  });

  it("keeps server failures visible on the Review step", async () => {
    const user = userEvent.setup();
    setRole("organizer");
    server.use(
      http.post("*/rest/v1/events", () =>
        HttpResponse.json(
          {
            code: "23505",
            message: "Slug is already in use.",
            details: null,
            hint: null,
          },
          { status: 409 },
        ),
      ),
    );

    renderWizard();

    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: "Duplicate Event" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "duplicate-event" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/^starts/i), {
      target: { value: "2026-12-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText(/^ends/i), {
      target: { value: "2026-12-01T20:00" },
    });
    fireEvent.change(screen.getByLabelText(/rsvp deadline/i), {
      target: { value: "2026-12-01T17:00" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/total capacity/i), {
      target: { value: "120" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.click(
      await screen.findByRole("button", { name: /create event/i }),
    );

    expect(
      await screen.findByText("Slug is already in use."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /review your event/i }),
    ).toBeInTheDocument();
  });

  it("recovers all three timestamps when timezone becomes invalid and is restored to Asia/Manila", async () => {
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
            id: "event-tz-restore-1",
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
      target: { value: "Timezone Restore Event" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "tz-restore-event" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/^starts/i), {
      target: { value: "2026-12-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText(/^ends/i), {
      target: { value: "2026-12-01T20:00" },
    });
    fireEvent.change(screen.getByLabelText(/rsvp deadline/i), {
      target: { value: "2026-12-01T17:00" },
    });

    const timezoneInput = screen.getByLabelText(/time zone/i);
    fireEvent.change(timezoneInput, { target: { value: "Not/A_Zone" } });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      await screen.findByText(/enter a valid iana timezone/i),
    ).toBeInTheDocument();
    expect(timezoneInput).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(timezoneInput, { target: { value: "  Asia/Manila  " } });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/total capacity/i), {
      target: { value: "80" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(
      await screen.findByRole("button", { name: /create event/i }),
    );

    await waitFor(() => {
      expect(submittedBody).toHaveBeenCalledTimes(1);
    });
    expect(submittedBody.mock.calls[0][0]).toMatchObject({
      event_timezone: "Asia/Manila",
      starts_at: "2026-12-01T10:00:00.000Z",
      ends_at: "2026-12-01T12:00:00.000Z",
      rsvp_deadline: "2026-12-01T09:00:00.000Z",
    });
  });

  it("synchronizes dates entered while timezone is invalid once timezone is corrected", async () => {
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
            id: "event-tz-invalid-first",
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
      target: { value: "Invalid First Event" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "invalid-first-event" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    const timezoneInput = await screen.findByLabelText(/time zone/i);
    fireEvent.change(timezoneInput, { target: { value: "Invalid/Zone" } });

    fireEvent.change(screen.getByLabelText(/^starts/i), {
      target: { value: "2026-12-02T14:00" },
    });
    fireEvent.change(screen.getByLabelText(/^ends/i), {
      target: { value: "2026-12-02T16:30" },
    });
    fireEvent.change(screen.getByLabelText(/rsvp deadline/i), {
      target: { value: "2026-12-02T12:00" },
    });

    fireEvent.change(timezoneInput, { target: { value: "Asia/Manila" } });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/total capacity/i), {
      target: { value: "60" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(
      await screen.findByRole("button", { name: /create event/i }),
    );

    await waitFor(() => {
      expect(submittedBody).toHaveBeenCalledTimes(1);
    });
    expect(submittedBody.mock.calls[0][0]).toMatchObject({
      event_timezone: "Asia/Manila",
      starts_at: "2026-12-02T06:00:00.000Z",
      ends_at: "2026-12-02T08:30:00.000Z",
      rsvp_deadline: "2026-12-02T04:00:00.000Z",
    });
  });

  it("preserves wall-clock inputs when switching UTC to Asia/Manila and updates all three ISO values", async () => {
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
            id: "event-utc-to-manila",
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
      target: { value: "UTC to Manila" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "utc-to-manila" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    const timezoneInput = await screen.findByLabelText(/time zone/i);
    fireEvent.change(timezoneInput, { target: { value: "UTC" } });

    const startsInput = screen.getByLabelText(/^starts/i);
    const endsInput = screen.getByLabelText(/^ends/i);
    const deadlineInput = screen.getByLabelText(/rsvp deadline/i);

    fireEvent.change(startsInput, { target: { value: "2026-12-10T18:00" } });
    fireEvent.change(endsInput, { target: { value: "2026-12-10T21:00" } });
    fireEvent.change(deadlineInput, { target: { value: "2026-12-10T15:00" } });

    fireEvent.change(timezoneInput, { target: { value: "Asia/Manila" } });

    expect(startsInput).toHaveValue("2026-12-10T18:00");
    expect(endsInput).toHaveValue("2026-12-10T21:00");
    expect(deadlineInput).toHaveValue("2026-12-10T15:00");

    await user.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.change(await screen.findByLabelText(/total capacity/i), {
      target: { value: "200" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(
      await screen.findByRole("button", { name: /create event/i }),
    );

    await waitFor(() => {
      expect(submittedBody).toHaveBeenCalledTimes(1);
    });
    expect(submittedBody.mock.calls[0][0]).toMatchObject({
      event_timezone: "Asia/Manila",
      starts_at: "2026-12-10T10:00:00.000Z",
      ends_at: "2026-12-10T13:00:00.000Z",
      rsvp_deadline: "2026-12-10T07:00:00.000Z",
    });
  });

  it("blocks progression and displays a visible error when timezone is empty", async () => {
    const user = userEvent.setup();
    renderWizard();

    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: "Empty Timezone Event" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "empty-tz-event" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    const timezoneInput = await screen.findByLabelText(/time zone/i);
    fireEvent.change(screen.getByLabelText(/^starts/i), {
      target: { value: "2026-12-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText(/^ends/i), {
      target: { value: "2026-12-01T20:00" },
    });
    fireEvent.change(screen.getByLabelText(/rsvp deadline/i), {
      target: { value: "2026-12-01T17:00" },
    });
    fireEvent.change(timezoneInput, { target: { value: "" } });

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      await screen.findByText(/event timezone is required/i),
    ).toBeInTheDocument();
    expect(timezoneInput).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByRole("heading", { name: /schedule and location/i }),
    ).toBeInTheDocument();
  });

  it("keeps cleared date fields empty and does not resurrect previous values", async () => {
    const user = userEvent.setup();
    renderWizard();

    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: "Clear Date Event" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "clear-date-event" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    const startsInput = await screen.findByLabelText(/^starts/i);
    const endsInput = screen.getByLabelText(/^ends/i);
    const deadlineInput = screen.getByLabelText(/rsvp deadline/i);
    const timezoneInput = screen.getByLabelText(/time zone/i);

    fireEvent.change(startsInput, { target: { value: "2026-12-01T18:00" } });
    fireEvent.change(endsInput, { target: { value: "2026-12-01T20:00" } });
    fireEvent.change(deadlineInput, { target: { value: "2026-12-01T17:00" } });

    fireEvent.change(endsInput, { target: { value: "" } });
    expect(endsInput).toHaveValue("");

    fireEvent.change(timezoneInput, { target: { value: "Asia/Manila" } });
    expect(endsInput).toHaveValue("");

    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(
      screen.getByRole("heading", { name: /schedule and location/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(endsInput).toHaveAttribute("aria-invalid", "true");
    });
  });

  it("rejects end-before-start and deadline-after-start chronology errors", async () => {
    const user = userEvent.setup();
    renderWizard();

    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: "Chronology Check" },
    });
    fireEvent.change(screen.getByLabelText(/event slug/i), {
      target: { value: "chronology-check" },
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/^starts/i), {
      target: { value: "2026-12-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText(/^ends/i), {
      target: { value: "2026-12-01T17:00" },
    });
    fireEvent.change(screen.getByLabelText(/rsvp deadline/i), {
      target: { value: "2026-12-01T19:00" },
    });

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      await screen.findByText(/end time must be after the start time/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/rsvp deadline must be at or before the start time/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /schedule and location/i }),
    ).toBeInTheDocument();
  });
});

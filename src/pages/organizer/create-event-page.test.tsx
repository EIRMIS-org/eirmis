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
});

// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { toast } from "sonner";
import {
  listAttendees,
  listCheckInAssignments,
  setRole,
  type Attendee,
  type Event,
  type Invitation,
} from "@/lib/api";
import { resetMockCheckInState } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { StaffScanPage } from "@/pages/staff/staff-scan-page";
import { StaffSearchPage } from "@/pages/staff/staff-search-page";
import { AttendanceSummary } from "./components/attendance-summary";
import { ScanOutcomeDisplay } from "./components/scan-outcome-display";
import { ScanSimulator } from "./components/scan-simulator";
import { WalkInModal } from "./components/walk-in-modal";
import { ATTENDANCE_REFETCH_INTERVAL_MS } from "./hooks/use-attendance-summary";
import {
  SELECTED_ASSIGNMENT_STORAGE_KEY,
  type CheckInAssignment,
} from "./hooks/use-my-assignment";
import {
  countScanSessionLog,
  initialScanSessionState,
  initialScanState,
  MAX_SCAN_SESSION_LOG_ENTRIES,
  scanResultReducer,
  scanSessionReducer,
  type ScanSessionLogEntry,
} from "./lib/scan-result-machine";

const ASSIGNED_EVENT_ID = "55555555-5555-5555-5555-555555555555";
const OTHER_EVENT_ID = "55555555-5555-5555-5555-555555555599";
const ASSIGNED_INVITATION_ID = "66666666-6666-6666-6666-666666666666";
const OTHER_INVITATION_ID = "66666666-6666-6666-6666-666666666699";

function renderWithProviders(ui: React.ReactElement, initialRoute = "/staff") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>{ui}</MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

describe("check-in staff portal hardening", () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    setRole("checkin");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanup();
    window.sessionStorage.clear();
    resetMockCheckInState();
    server.resetHandlers();
    setRole("checkin");
  });

  afterAll(() => {
    setRole("public");
    server.close();
  });

  describe("scan-result-machine additive session reducer", () => {
    it("keeps existing scanResultReducer transitions untouched and logs terminal outcomes most-recent-first", () => {
      const started = scanResultReducer(initialScanState, {
        type: "SCAN_START",
        token: "tok-1",
      });
      expect(started).toEqual({ status: "resolving", ticketCode: "tok-1" });
      expect(scanResultReducer(started, { type: "SCAN_RESET" })).toEqual(
        initialScanState,
      );

      let state = initialScanSessionState;
      state = scanSessionReducer(state, { type: "SCAN_START", token: "tok-1" });
      expect(state.log).toHaveLength(0);

      state = scanSessionReducer(state, {
        type: "SCAN_RESOLVED_SUCCESS",
        payload: {
          result: "accepted",
          attendee: {
            id: "att-1",
            invitation_id: ASSIGNED_INVITATION_ID,
            full_name: "Maria Santos",
            email: "maria@example.com",
            is_primary: true,
            status: "approved",
            submitted_at: "2026-10-05T14:00:00+08:00",
            reviewed_by: null,
            reviewed_at: null,
            review_reason: null,
            qr_token: "tok-1",
            checked_in: true,
            checked_in_at: "2026-12-15T18:00:00+08:00",
            checked_in_by: null,
            is_walk_in: false,
          },
          checked_in_at: "2026-12-15T18:00:00+08:00",
          message: null,
        },
      });
      state = scanSessionReducer(state, {
        type: "SCAN_START",
        token: "bad-tok",
      });
      state = scanSessionReducer(state, {
        type: "SCAN_FAILED_INVALID_TOKEN",
        message: "Bad signature",
      });
      state = scanSessionReducer(state, { type: "SCAN_RESET" });

      expect(state.current).toEqual(initialScanState);
      expect(state.log).toHaveLength(2);
      expect(state.log[0]).toMatchObject({
        subject: "bad-tok",
        outcome: "invalid-token",
      });
      expect(state.log[1]).toMatchObject({
        subject: "Maria Santos",
        outcome: "success",
      });
      expect(countScanSessionLog(state.log)).toEqual({ ok: 1, total: 2 });

      state = scanSessionReducer(state, { type: "SESSION_LOG_CLEAR" });
      expect(state.log).toEqual([]);
      expect(countScanSessionLog(state.log)).toEqual({ ok: 0, total: 0 });
    });
  });

  describe("walk-in modal searchable invitation lookup", () => {
    it("selects an accepted invitation without typing a UUID, creates the walk-in, and checks them in", async () => {
      setRole("checkin");
      const user = userEvent.setup();

      renderWithProviders(
        <WalkInModal eventId={ASSIGNED_EVENT_ID} />,
        "/staff/search",
      );

      await user.click(
        screen.getByRole("button", { name: /register walk-in/i }),
      );

      const filterInput = await screen.findByLabelText(
        /filter accepted invitations/i,
        undefined,
        { timeout: 5000 },
      );
      const selectTrigger = screen.getByRole("combobox", {
        name: /accepted invitation/i,
      });

      await waitFor(
        () => {
          expect(selectTrigger).toBeEnabled();
        },
        { timeout: 5000 },
      );

      await user.type(filterInput, "jordan");
      await user.click(selectTrigger);

      const guestOption = await screen.findByRole(
        "option",
        { name: /jordan cruz.*party 2\/4/i },
        { timeout: 5000 },
      );
      expect(
        screen.queryByRole("option", { name: /jose rizal/i }),
      ).not.toBeInTheDocument();

      await user.click(guestOption);

      await user.type(screen.getByLabelText(/full name/i), "Walk-in Guest");
      await user.type(screen.getByLabelText(/email/i), "walkin@example.com");
      await user.click(
        screen.getByRole("button", { name: /register and check in/i }),
      );

      await waitFor(
        () => {
          expect(
            screen.queryByRole("heading", { name: /register a walk-in/i }),
          ).not.toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const attendees = await listAttendees({
        invitation_id: `eq.${ASSIGNED_INVITATION_ID}`,
      });
      expect(
        attendees.find((attendee) => attendee.full_name === "Walk-in Guest"),
      ).toMatchObject({
        is_walk_in: true,
        checked_in: true,
      });
    }, 15_000);

    it("falls back to a shortened invitation ID when no guest or attendee name exists", async () => {
      setRole("checkin");
      const user = userEvent.setup();

      server.use(
        http.get("*/rest/v1/guests", () => HttpResponse.json([])),
        http.get("*/rest/v1/attendees", () => HttpResponse.json([])),
      );

      renderWithProviders(
        <WalkInModal eventId={ASSIGNED_EVENT_ID} />,
        "/staff/search",
      );

      await user.click(
        screen.getByRole("button", { name: /register walk-in/i }),
      );

      const selectTrigger = await screen.findByRole(
        "combobox",
        { name: /accepted invitation/i },
        { timeout: 5000 },
      );
      await waitFor(
        () => {
          expect(selectTrigger).toBeEnabled();
        },
        { timeout: 5000 },
      );

      await user.click(selectTrigger);

      expect(
        await screen.findByRole(
          "option",
          { name: /invitation 66666666.*party 2\/4/i },
          { timeout: 5000 },
        ),
      ).toBeInTheDocument();
    }, 15_000);

    it("preserves retry state if initial check-in fails after walk-in creation", async () => {
      setRole("checkin");
      const user = userEvent.setup();

      server.use(
        http.post("*/functions/v1/checkin/scan", () =>
          HttpResponse.json({
            result: "invalid_token",
            attendee: null,
            message: "Temporary scanner outage",
          }),
        ),
      );

      renderWithProviders(
        <WalkInModal eventId={ASSIGNED_EVENT_ID} />,
        "/staff/search",
      );

      await user.click(
        screen.getByRole("button", { name: /register walk-in/i }),
      );

      const selectTrigger = await screen.findByRole(
        "combobox",
        { name: /accepted invitation/i },
        { timeout: 5000 },
      );
      await waitFor(
        () => {
          expect(selectTrigger).toBeEnabled();
        },
        { timeout: 5000 },
      );

      await user.click(selectTrigger);
      await user.click(
        await screen.findByRole(
          "option",
          { name: /jordan cruz/i },
          { timeout: 5000 },
        ),
      );
      await user.type(screen.getByLabelText(/full name/i), "Retry Guest");
      await user.click(
        screen.getByRole("button", { name: /register and check in/i }),
      );

      expect(
        await screen.findByText(/temporary scanner outage/i, undefined, {
          timeout: 5000,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /retry check-in/i }),
      ).toBeInTheDocument();
      expect(selectTrigger).toBeDisabled();
    }, 15_000);
  });

  describe("scan session log on StaffScanPage", () => {
    it("records outcomes most-recent-first, updates the counter, clears, and persists across reload", async () => {
      setRole("checkin");
      const user = userEvent.setup();

      const { unmount } = renderWithProviders(<StaffScanPage />, "/staff");

      expect(
        await screen.findByText("Annual Gala 2026", undefined, {
          timeout: 5000,
        }),
      ).toBeInTheDocument();
      expect(screen.getByText("0 OK / 0 total")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /1\. valid qr/i }));
      await waitFor(
        () => {
          expect(screen.getByText("1 OK / 1 total")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      await user.click(screen.getByRole("button", { name: /2\. duplicate/i }));
      await waitFor(
        () => {
          expect(screen.getByText("1 OK / 2 total")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      await user.click(screen.getByRole("button", { name: /3\. bad token/i }));
      await waitFor(
        () => {
          expect(screen.getByText(/1 OK \/ 3 total/i)).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      await user.click(
        screen.getByRole("button", { name: /4\. wrong event/i }),
      );
      await waitFor(
        () => {
          expect(screen.getByText("1 OK / 4 total")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const logList = screen.getByRole("list", {
        name: /recent session scans/i,
      });
      const items = within(logList).getAllByRole("listitem");
      expect(items).toHaveLength(4);
      expect(items[0]).toHaveTextContent(/wrong event/i);
      expect(items[1]).toHaveTextContent(/invalid/i);
      expect(items[2]).toHaveTextContent(/already checked in/i);
      expect(items[3]).toHaveTextContent(/maria santos/i);
      expect(items[3]).toHaveTextContent(/success/i);

      // Verify sessionStorage persistence across remount
      unmount();
      renderWithProviders(<StaffScanPage />, "/staff");
      expect(
        await screen.findByText("1 OK / 4 total", undefined, {
          timeout: 5000,
        }),
      ).toBeInTheDocument();

      // Clear log and confirm subsequent scans record cleanly
      await user.click(screen.getByRole("button", { name: /clear log/i }));
      expect(screen.getByText("0 OK / 0 total")).toBeInTheDocument();
      expect(
        screen.getByText(/no scans recorded in this session yet/i),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /3\. bad token/i }));
      await waitFor(
        () => {
          expect(screen.getByText("0 OK / 1 total")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    }, 15_000);
  });

  describe("event-scoped manual search", () => {
    it("lists only attendees belonging to the assigned event with a count line and allows check-in", async () => {
      setRole("checkin");
      const user = userEvent.setup();

      const eventAInvitation: Invitation = {
        id: ASSIGNED_INVITATION_ID,
        event_id: ASSIGNED_EVENT_ID,
        guest_id: "33333333-3333-3333-3333-333333333333",
        status: "accepted",
        max_party_size: 4,
        party_size: 1,
        checked_in_count: 0,
        dietary_preference: null,
        special_requests: null,
        invited_by: "11111111-1111-1111-1111-111111111111",
        invited_at: "2026-10-01T09:00:00+08:00",
        responded_at: "2026-10-05T14:30:00+08:00",
        waitlisted_at: null,
        created_at: "2026-10-01T09:00:00+08:00",
        updated_at: "2026-10-05T14:30:00+08:00",
      };
      const eventBInvitation: Invitation = {
        ...eventAInvitation,
        id: OTHER_INVITATION_ID,
        event_id: OTHER_EVENT_ID,
      };

      let attendeesStore: Attendee[] = [
        {
          id: "77777777-7777-7777-7777-777777777777",
          invitation_id: ASSIGNED_INVITATION_ID,
          full_name: "Maria Santos",
          email: "maria.santos@example.com",
          is_primary: true,
          status: "approved",
          submitted_at: "2026-10-05T14:00:00+08:00",
          reviewed_by: "11111111-1111-1111-1111-111111111111",
          reviewed_at: "2026-10-06T09:00:00+08:00",
          review_reason: null,
          qr_token: "signed-qr-token-sample",
          checked_in: false,
          checked_in_at: null,
          checked_in_by: null,
          is_walk_in: false,
        },
        {
          id: "77777777-7777-7777-7777-777777777799",
          invitation_id: OTHER_INVITATION_ID,
          full_name: "Event B Intruder",
          email: "other.event@example.com",
          is_primary: true,
          status: "approved",
          submitted_at: "2026-10-05T14:00:00+08:00",
          reviewed_by: "11111111-1111-1111-1111-111111111111",
          reviewed_at: "2026-10-06T09:00:00+08:00",
          review_reason: null,
          qr_token: "other-event-token",
          checked_in: false,
          checked_in_at: null,
          checked_in_by: null,
          is_walk_in: false,
        },
      ];

      server.use(
        http.get("*/rest/v1/invitations", ({ request }) => {
          const eventFilter = new URL(request.url).searchParams.get("event_id");
          const all = [eventAInvitation, eventBInvitation];
          const filtered = eventFilter?.startsWith("eq.")
            ? all.filter((inv) => inv.event_id === eventFilter.slice(3))
            : all;
          return HttpResponse.json(filtered);
        }),
        http.get("*/rest/v1/attendees", () =>
          HttpResponse.json(attendeesStore),
        ),
        http.post("*/functions/v1/checkin/scan", async ({ request }) => {
          const body = (await request.json()) as { qr_token?: string };
          const matched = attendeesStore.find(
            (item) => item.qr_token === body.qr_token,
          );
          if (!matched) {
            return HttpResponse.json({
              result: "invalid_token",
              attendee: null,
              message: "Not found",
            });
          }
          const updated: Attendee = {
            ...matched,
            checked_in: true,
            checked_in_at: "2026-12-15T18:10:00+08:00",
          };
          attendeesStore = attendeesStore.map((item) =>
            item.id === updated.id ? updated : item,
          );
          return HttpResponse.json({
            result: "accepted",
            attendee: updated,
            checked_in_at: updated.checked_in_at,
            message: null,
          });
        }),
      );

      renderWithProviders(<StaffSearchPage />, "/staff/search");

      expect(await screen.findByText("Maria Santos")).toBeInTheDocument();
      expect(screen.getByText("1 attendee for this event")).toBeInTheDocument();
      expect(screen.queryByText("Event B Intruder")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /^check in$/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /checked in/i }),
        ).toBeDisabled();
      });
    });

    it("shows toast feedback for accepted, already_checked_in, and invalid_token in ManualSearchTable", async () => {
      setRole("checkin");
      const user = userEvent.setup();
      const successSpy = vi.spyOn(toast, "success");
      const warningSpy = vi.spyOn(toast, "warning");
      const errorSpy = vi.spyOn(toast, "error");

      const attendees: Attendee[] = [
        {
          id: "77777777-7777-7777-7777-777777777771",
          invitation_id: ASSIGNED_INVITATION_ID,
          full_name: "Accepted Guest",
          email: "accepted@example.com",
          is_primary: true,
          status: "approved",
          submitted_at: "2026-10-05T14:00:00+08:00",
          reviewed_by: null,
          reviewed_at: null,
          review_reason: null,
          qr_token: "tok-accepted",
          checked_in: false,
          checked_in_at: null,
          checked_in_by: null,
          is_walk_in: false,
        },
        {
          id: "77777777-7777-7777-7777-777777777772",
          invitation_id: ASSIGNED_INVITATION_ID,
          full_name: "Duplicate Guest",
          email: "duplicate@example.com",
          is_primary: false,
          status: "approved",
          submitted_at: "2026-10-05T14:00:00+08:00",
          reviewed_by: null,
          reviewed_at: null,
          review_reason: null,
          qr_token: "tok-duplicate",
          checked_in: false,
          checked_in_at: null,
          checked_in_by: null,
          is_walk_in: false,
        },
        {
          id: "77777777-7777-7777-7777-777777777773",
          invitation_id: ASSIGNED_INVITATION_ID,
          full_name: "Invalid Token Guest",
          email: "invalid@example.com",
          is_primary: false,
          status: "approved",
          submitted_at: "2026-10-05T14:00:00+08:00",
          reviewed_by: null,
          reviewed_at: null,
          review_reason: null,
          qr_token: "tok-invalid",
          checked_in: false,
          checked_in_at: null,
          checked_in_by: null,
          is_walk_in: false,
        },
      ];

      server.use(
        http.get("*/rest/v1/attendees", () => HttpResponse.json(attendees)),
        http.post("*/functions/v1/checkin/scan", async ({ request }) => {
          const body = (await request.json()) as { qr_token?: string };
          if (body.qr_token === "tok-accepted") {
            return HttpResponse.json({
              result: "accepted",
              attendee: attendees[0],
              checked_in_at: "2026-12-15T18:10:00+08:00",
              message: null,
            });
          }
          if (body.qr_token === "tok-duplicate") {
            return HttpResponse.json({
              result: "already_checked_in",
              attendee: attendees[1],
              checked_in_at: "2026-12-15T17:30:00+08:00",
              message: "Already checked in earlier",
            });
          }
          return HttpResponse.json({
            result: "invalid_token",
            attendee: null,
            checked_in_at: null,
            message: "Expired QR token",
          });
        }),
      );

      renderWithProviders(<StaffSearchPage />, "/staff/search");

      const buttons = await screen.findAllByRole("button", {
        name: /^check in$/i,
      });
      expect(buttons).toHaveLength(3);

      await user.click(buttons[0]);
      await waitFor(() => {
        expect(successSpy).toHaveBeenCalledWith("Check-in recorded");
      });

      await user.click(buttons[1]);
      await waitFor(() => {
        expect(warningSpy).toHaveBeenCalledWith("Already checked in earlier");
      });

      await user.click(buttons[2]);
      await waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith("Expired QR token");
      });

      successSpy.mockRestore();
      warningSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe("assignment-derived event (zero / one / many)", () => {
    it("derives the assigned event from checkin_assignments when staff has one active assignment", async () => {
      setRole("checkin");

      renderWithProviders(<StaffScanPage />, "/staff");

      expect(
        await screen.findByText("Annual Gala 2026", undefined, {
          timeout: 5000,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /manual search/i }),
      ).toHaveAttribute("href", "/staff/search");
      expect(
        screen.getByRole("region", { name: /attendance summary/i }),
      ).toBeInTheDocument();
    });

    it("renders actionable guidance and hides the manual search link when staff has zero assignments", async () => {
      setRole("checkin");

      server.use(
        http.get("*/rest/v1/checkin_assignments", () => HttpResponse.json([])),
      );

      renderWithProviders(<StaffScanPage />, "/staff");

      expect(
        await screen.findByText(
          /no check-in assignment found for your account — ask an organizer to assign you to an event/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /manual search/i }),
      ).not.toBeInTheDocument();
    });

    it("renders actionable guidance when an assignment exists but the event record cannot be loaded", async () => {
      setRole("checkin");

      server.use(http.get("*/rest/v1/events", () => HttpResponse.json([])));

      renderWithProviders(<StaffScanPage />, "/staff");

      expect(
        await screen.findByText(
          /no check-in assignment found for your account — ask an organizer to assign you to an event/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /manual search/i }),
      ).not.toBeInTheDocument();
    });

    it("shows an assignment picker when staff has multiple active assignments and persists the selection", async () => {
      setRole("checkin");
      const user = userEvent.setup();

      const assignments: CheckInAssignment[] = [
        {
          id: "88888888-8888-8888-8888-888888888888",
          event_id: ASSIGNED_EVENT_ID,
          staff_email: "staff@example.com",
          auth_user_id: "44444444-4444-4444-4444-444444444444",
          invited_by: "11111111-1111-1111-1111-111111111111",
          status: "active",
          created_at: "2026-12-10T08:00:00+08:00",
          updated_at: "2026-12-10T08:00:00+08:00",
        },
        {
          id: "88888888-8888-8888-8888-888888888899",
          event_id: OTHER_EVENT_ID,
          staff_email: "staff@example.com",
          auth_user_id: "44444444-4444-4444-4444-444444444444",
          invited_by: "11111111-1111-1111-1111-111111111111",
          status: "active",
          created_at: "2026-12-10T08:00:00+08:00",
          updated_at: "2026-12-10T08:00:00+08:00",
        },
      ];

                const events: Event[] = [
                    {
                        id: ASSIGNED_EVENT_ID,
                        organizer_id: '11111111-1111-1111-1111-111111111111',
                        title: 'Annual Gala 2026',
                        slug: 'annual-gala-2026',
                        description: null,
                        starts_at: '2026-12-15T18:00:00+08:00',
                        ends_at: '2026-12-15T22:00:00+08:00',
                        event_timezone: 'Asia/Manila',
                        venue_name: 'Grand Ballroom',
                        address: '123 Rizal Avenue',
                        city: 'Cebu City',
                        capacity: 500,
                        rsvp_deadline: '2026-12-01T23:59:59+08:00',
                        visibility_mode: 'open_registration',
                        status: 'published',
                        deleted_at: null,
                        created_at: '2026-09-01T08:00:00+08:00',
                        updated_at: '2026-09-10T12:30:00+08:00',
                    },
                    {
                        id: OTHER_EVENT_ID,
                        organizer_id: '11111111-1111-1111-1111-111111111111',
                        title: 'Regional Summit 2026',
                        slug: 'regional-summit-2026',
                        description: null,
                        starts_at: '2026-12-20T09:00:00+08:00',
                        ends_at: '2026-12-20T17:00:00+08:00',
                        event_timezone: 'Asia/Manila',
                        venue_name: 'Convention Center',
                        address: '456 Osmena Blvd',
                        city: 'Cebu City',
                        capacity: 300,
                        rsvp_deadline: '2026-12-10T23:59:59+08:00',
                        visibility_mode: 'invite_only',
                        status: 'published',
                        deleted_at: null,
                        created_at: '2026-09-01T08:00:00+08:00',
                        updated_at: '2026-09-10T12:30:00+08:00',
                    },
                ]

      server.use(
        http.get("*/rest/v1/checkin_assignments", () =>
          HttpResponse.json(assignments),
        ),
        http.get("*/rest/v1/events", ({ request }) => {
          const idFilter = new URL(request.url).searchParams.get("id");
          const filtered = idFilter?.startsWith("eq.")
            ? events.filter((event) => event.id === idFilter.slice(3))
            : events;
          return HttpResponse.json(filtered);
        }),
      );

      const { unmount } = renderWithProviders(<StaffScanPage />, "/staff");

      expect(
        await screen.findByText(/choose an event above to start checking in/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /manual search/i }),
      ).not.toBeInTheDocument();

      const trigger = screen.getByRole("combobox", { name: /assigned event/i });
      await user.click(trigger);

      const summitOption = await screen.findByRole("option", {
        name: /regional summit 2026/i,
      });
      expect(
        screen.getByRole("option", { name: /annual gala 2026/i }),
      ).toBeInTheDocument();

      await user.click(summitOption);

      expect(
        await screen.findByRole("heading", { name: "Regional Summit 2026" }),
      ).toBeInTheDocument();
      expect(
        window.sessionStorage.getItem(SELECTED_ASSIGNMENT_STORAGE_KEY),
      ).toBe(OTHER_EVENT_ID);

      // Verify persistence across remount
      unmount();
      renderWithProviders(<StaffScanPage />, "/staff");

      expect(
        await screen.findByRole("heading", { name: "Regional Summit 2026" }),
      ).toBeInTheDocument();
    }, 15_000);

    it("scopes GET /rest/v1/checkin_assignments to the signed-in checkin staff in MSW", async () => {
      setRole("checkin");
      const staffAssignments = await listCheckInAssignments();
      expect(staffAssignments).toHaveLength(1);
      expect(staffAssignments[0]).toMatchObject({
        event_id: ASSIGNED_EVENT_ID,
        auth_user_id: "44444444-4444-4444-4444-444444444444",
        status: "active",
      });

      setRole("organizer");
      const organizerAssignments =
        await listCheckInAssignments(ASSIGNED_EVENT_ID);
      expect(organizerAssignments).toHaveLength(1);
      expect(organizerAssignments[0]?.event_id).toBe(ASSIGNED_EVENT_ID);
    });
  });

  describe("attendance summary panel", () => {
    it("renders expected vs checked-in vs capacity from mock data and configures 30s refetch", async () => {
      setRole("checkin");

      const baseInvitation: Invitation = {
        id: ASSIGNED_INVITATION_ID,
        event_id: ASSIGNED_EVENT_ID,
        guest_id: "33333333-3333-3333-3333-333333333333",
        status: "accepted",
        max_party_size: 4,
        party_size: 2,
        checked_in_count: 1,
        dietary_preference: null,
        special_requests: null,
        invited_by: "11111111-1111-1111-1111-111111111111",
        invited_at: "2026-10-01T09:00:00+08:00",
        responded_at: "2026-10-05T14:30:00+08:00",
        waitlisted_at: null,
        created_at: "2026-10-01T09:00:00+08:00",
        updated_at: "2026-10-05T14:30:00+08:00",
      };
      const secondAcceptedId = "66666666-6666-6666-6666-666666666677";
      const declinedId = "66666666-6666-6666-6666-666666666688";

      const invitations: Invitation[] = [
        baseInvitation,
        { ...baseInvitation, id: secondAcceptedId, party_size: 3 },
        {
          ...baseInvitation,
          id: declinedId,
          status: "declined",
          party_size: 4,
        },
      ];

      const baseAttendee: Attendee = {
        id: "77777777-7777-7777-7777-777777777771",
        invitation_id: ASSIGNED_INVITATION_ID,
        full_name: "Maria Santos",
        email: "maria@example.com",
        is_primary: true,
        status: "approved",
        submitted_at: "2026-10-05T14:00:00+08:00",
        reviewed_by: "11111111-1111-1111-1111-111111111111",
        reviewed_at: "2026-10-06T09:00:00+08:00",
        review_reason: null,
        qr_token: "tok-a",
        checked_in: true,
        checked_in_at: "2026-12-15T18:05:00+08:00",
        checked_in_by: "44444444-4444-4444-4444-444444444444",
        is_walk_in: false,
      };
      const attendees: Attendee[] = [
        baseAttendee,
        {
          ...baseAttendee,
          id: "77777777-7777-7777-7777-777777777772",
          invitation_id: secondAcceptedId,
          checked_in: true,
        },
        {
          ...baseAttendee,
          id: "77777777-7777-7777-7777-777777777773",
          invitation_id: secondAcceptedId,
          checked_in: false,
          checked_in_at: null,
        },
        // Different event — must not be counted
        {
          ...baseAttendee,
          id: "77777777-7777-7777-7777-777777777774",
          invitation_id: OTHER_INVITATION_ID,
          checked_in: true,
        },
      ];

      server.use(
        http.get("*/rest/v1/invitations", () => HttpResponse.json(invitations)),
        http.get("*/rest/v1/attendees", () => HttpResponse.json(attendees)),
      );

      const { queryClient } = renderWithProviders(
        <AttendanceSummary eventId={ASSIGNED_EVENT_ID} capacity={500} />,
        "/staff",
      );

      const region = await screen.findByRole("region", {
        name: /attendance summary/i,
      });

      await waitFor(() => {
        expect(within(region).getByText("5")).toBeInTheDocument();
      });
      expect(within(region).getByText("Expected")).toBeInTheDocument();
      expect(within(region).getByText("Checked-in")).toBeInTheDocument();
      expect(within(region).getByText("2")).toBeInTheDocument();
      expect(within(region).getByText("Capacity")).toBeInTheDocument();
      expect(within(region).getByText("500")).toBeInTheDocument();

      expect(ATTENDANCE_REFETCH_INTERVAL_MS).toBe(30_000);
      const cachedQueries = queryClient.getQueryCache().getAll();
      const invitationsQuery = cachedQueries.find(
        (q) => q.queryKey[0] === "listInvitations",
      );
      const attendeesQuery = cachedQueries.find(
        (q) => q.queryKey[0] === "listAttendees",
      );
      expect(
        (invitationsQuery?.options as { refetchInterval?: number } | undefined)
          ?.refetchInterval,
      ).toBe(30_000);
      expect(
        (attendeesQuery?.options as { refetchInterval?: number } | undefined)
          ?.refetchInterval,
      ).toBe(30_000);
    });

    it("chunks attendee queries for large events (>100 invitations) and merges checked-in counts", async () => {
      setRole("checkin");

      const invitations: Invitation[] = Array.from(
        { length: 160 },
        (_, idx) => ({
          id: `66666666-6666-4666-8666-${String(idx + 1).padStart(12, "0")}`,
          event_id: ASSIGNED_EVENT_ID,
          guest_id: "33333333-3333-3333-3333-333333333333",
          status: "accepted",
          max_party_size: 2,
          party_size: 1,
          checked_in_count: idx < 100 ? 1 : 0,
          dietary_preference: null,
          special_requests: null,
          invited_by: "11111111-1111-1111-1111-111111111111",
          invited_at: "2026-10-01T09:00:00+08:00",
          responded_at: "2026-10-05T14:30:00+08:00",
          waitlisted_at: null,
          created_at: "2026-10-01T09:00:00+08:00",
          updated_at: "2026-10-05T14:30:00+08:00",
        }),
      );

      const attendees: Attendee[] = invitations.map((inv, idx) => ({
        id: `77777777-7777-4777-8777-${String(idx + 1).padStart(12, "0")}`,
        invitation_id: inv.id,
        full_name: `Large Event Guest ${idx + 1}`,
        email: `guest-${idx + 1}@example.com`,
        is_primary: true,
        status: "approved",
        submitted_at: "2026-10-05T14:00:00+08:00",
        reviewed_by: "11111111-1111-1111-1111-111111111111",
        reviewed_at: "2026-10-06T09:00:00+08:00",
        review_reason: null,
        qr_token: `tok-large-${idx + 1}`,
        checked_in: idx < 100,
        checked_in_at: idx < 100 ? "2026-12-15T18:05:00+08:00" : null,
        checked_in_by:
          idx < 100 ? "44444444-4444-4444-4444-444444444444" : null,
        is_walk_in: false,
      }));

      const chunkLengths: number[] = [];
      server.use(
        http.get("*/rest/v1/invitations", () => HttpResponse.json(invitations)),
        http.get("*/rest/v1/attendees", ({ request }) => {
          const filter =
            new URL(request.url).searchParams.get("invitation_id") ?? "";
          const ids =
            filter.startsWith("in.(") && filter.endsWith(")")
              ? filter.slice(4, -1).split(",").filter(Boolean)
              : [];
          chunkLengths.push(ids.length);
          const idSet = new Set(ids);
          return HttpResponse.json(
            attendees.filter((attendee) => idSet.has(attendee.invitation_id)),
          );
        }),
      );

      renderWithProviders(
        <AttendanceSummary eventId={ASSIGNED_EVENT_ID} capacity={500} />,
        "/staff",
      );

      const region = await screen.findByRole("region", {
        name: /attendance summary/i,
      });

      await waitFor(() => {
        expect(within(region).getByText("160")).toBeInTheDocument();
        expect(within(region).getByText("100")).toBeInTheDocument();
      });

      expect(chunkLengths).toEqual([75, 75, 10]);
    });
  });

  describe("de-demoed scan flow", () => {
    it('shows "Verifying ticket…" in the resolving state without leaking endpoint paths', () => {
      renderWithProviders(
        <ScanOutcomeDisplay
          data={{ status: "resolving", ticketCode: "tok-1" }}
          onReset={vi.fn()}
        />,
        "/staff",
      );

      expect(screen.getByText("Verifying ticket…")).toBeInTheDocument();
      expect(screen.queryByText(/functions\/v1/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/calling post/i)).not.toBeInTheDocument();
    });

    it("hides scenario preset buttons when import.meta.env.DEV is falsy while keeping token input", () => {
      // Confirm dev presets are visible in default dev/test env
      const firstRender = renderWithProviders(
        <ScanSimulator dispatch={vi.fn()} isResolving={false} />,
        "/staff",
      );
      expect(
        screen.getByRole("button", { name: /1\. valid qr/i }),
      ).toBeInTheDocument();
      firstRender.unmount();

      // Stub DEV false to simulate production build behavior
      vi.stubEnv("DEV", false);
      renderWithProviders(
        <ScanSimulator dispatch={vi.fn()} isResolving={false} />,
        "/staff",
      );

      expect(
        screen.getByPlaceholderText(/paste or enter signed qr token/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^scan$/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /1\. valid qr/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /2\. duplicate/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /3\. bad token/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /4\. wrong event/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("session log cap", () => {
    it("trims oldest entries when appending past the cap in scanSessionReducer", () => {
      let state = initialScanSessionState;
      const totalToAppend = MAX_SCAN_SESSION_LOG_ENTRIES + 5;

      for (let i = 1; i <= totalToAppend; i += 1) {
        state = scanSessionReducer(state, {
          type: "SESSION_LOG_APPEND",
          entry: {
            id: `entry-${i}`,
            scannedAt: "18:00:00",
            subject: `Guest ${i}`,
            outcome: "success",
          },
        });
      }

      expect(state.log).toHaveLength(MAX_SCAN_SESSION_LOG_ENTRIES);
      expect(state.log[0]?.id).toBe(`entry-${totalToAppend}`);
      expect(state.log[MAX_SCAN_SESSION_LOG_ENTRIES - 1]?.id).toBe("entry-6");
    });

    it("trims oversized persisted session logs to the cap on load", async () => {
      setRole("checkin");

      const oversized: ScanSessionLogEntry[] = Array.from(
        { length: MAX_SCAN_SESSION_LOG_ENTRIES + 50 },
        (_, idx) => ({
          id: `persisted-${idx + 1}`,
          scannedAt: "18:00:00",
          subject: `Persisted Guest ${idx + 1}`,
          outcome: "invalid-token",
        }),
      );
      window.sessionStorage.setItem(
        `eirmis:staff-scan-log:${ASSIGNED_EVENT_ID}`,
        JSON.stringify(oversized),
      );

      renderWithProviders(<StaffScanPage />, "/staff");

      expect(
        await screen.findByText(
          `0 OK / ${MAX_SCAN_SESSION_LOG_ENTRIES} total`,
          undefined,
          { timeout: 5000 },
        ),
      ).toBeInTheDocument();
    });
  });

  describe("scan contract hardening", () => {
    it("does not fire success toast when response has result 'already_checked_in'", async () => {
      const toastSpy = vi.spyOn(toast, "success");
      const user = userEvent.setup();

      renderWithProviders(<StaffScanPage />, "/staff");

      expect(
        await screen.findByText("Annual Gala 2026", undefined, {
          timeout: 5000,
        }),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /2\. duplicate/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/duplicate scan detected/i),
        ).toBeInTheDocument();
      });

      expect(toastSpy).not.toHaveBeenCalled();
      toastSpy.mockRestore();
    });

    it("passes event_id in request payload to POST /functions/v1/checkin/scan", async () => {
      let capturedBody: { qr_token?: string; event_id?: string } | null = null;
      server.use(
        http.post("*/functions/v1/checkin/scan", async ({ request }) => {
          capturedBody = (await request.json()) as {
            qr_token?: string;
            event_id?: string;
          };
          return HttpResponse.json({
            result: "accepted",
            attendee: null,
            checked_in_at: new Date().toISOString(),
            message: null,
          });
        }),
      );

      const user = userEvent.setup();
      renderWithProviders(<StaffScanPage />, "/staff");

      expect(
        await screen.findByText("Annual Gala 2026", undefined, {
          timeout: 5000,
        }),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /1\. valid qr/i }));

      await waitFor(() => {
        expect(capturedBody).toMatchObject({
          qr_token: "signed-qr-token-sample",
          event_id: ASSIGNED_EVENT_ID,
        });
      });
    });

    it("queries attendees scoped to target event ID via invitation_id=in.(...) without full-table scan", async () => {
      const requestedUrls: string[] = [];
      server.use(
        http.get("*/rest/v1/attendees", ({ request }) => {
          requestedUrls.push(request.url);
          return HttpResponse.json([]);
        }),
      );

      renderWithProviders(<StaffSearchPage />, "/staff/search");

      await waitFor(() => {
        expect(requestedUrls.length).toBeGreaterThan(0);
      });

      for (const url of requestedUrls) {
        const invitationIdFilter = new URL(url).searchParams.get(
          "invitation_id",
        );
        expect(invitationIdFilter).toBeTruthy();
        expect(invitationIdFilter).toMatch(/^in\.\(.+\)$/);
      }
    });

    it("maps 422 EVENT_MISMATCH to wrong-event outcome without firing toast.error", async () => {
      const errorSpy = vi.spyOn(toast, "error");
      server.use(
        http.post("*/functions/v1/checkin/scan", () =>
          HttpResponse.json(
            {
              code: "EVENT_MISMATCH",
              message: "Ticket belongs to a different event.",
              details: null,
              hint: null,
            },
            { status: 422 },
          ),
        ),
      );

      try {
        const user = userEvent.setup();
        renderWithProviders(<StaffScanPage />, "/staff");

        expect(
          await screen.findByText("Annual Gala 2026", undefined, {
            timeout: 5000,
          }),
        ).toBeInTheDocument();

        const input = screen.getByPlaceholderText(
          /paste or enter signed qr token/i,
        );
        await user.type(input, "opaque-real-qr-token");
        await user.click(screen.getByRole("button", { name: /^scan$/i }));

        await waitFor(() => {
          expect(
            screen.getByText(/wrong event assignment/i),
          ).toBeInTheDocument();
          expect(
            screen.getByText(/ticket belongs to a different event\./i),
          ).toBeInTheDocument();
        });
        expect(errorSpy).not.toHaveBeenCalled();
      } finally {
        errorSpy.mockRestore();
      }
    });

    it("maps 422 INVALID_QR_TOKEN to invalid-token outcome without firing toast.error", async () => {
      const errorSpy = vi.spyOn(toast, "error");
      server.use(
        http.post("*/functions/v1/checkin/scan", () =>
          HttpResponse.json(
            {
              code: "INVALID_QR_TOKEN",
              message: "QR signature could not be verified.",
              details: null,
              hint: null,
            },
            { status: 422 },
          ),
        ),
      );

      try {
        const user = userEvent.setup();
        renderWithProviders(<StaffScanPage />, "/staff");

        expect(
          await screen.findByText("Annual Gala 2026", undefined, {
            timeout: 5000,
          }),
        ).toBeInTheDocument();

        const input = screen.getByPlaceholderText(
          /paste or enter signed qr token/i,
        );
        await user.type(input, "corrupted-qr-token");
        await user.click(screen.getByRole("button", { name: /^scan$/i }));

        await waitFor(() => {
          expect(
            screen.getByText(/qr signature could not be verified\./i),
          ).toBeInTheDocument();
        });
        expect(errorSpy).not.toHaveBeenCalled();
      } finally {
        errorSpy.mockRestore();
      }
    });

    it("maps 403 FORBIDDEN to unassigned event message without firing toast.error", async () => {
      const errorSpy = vi.spyOn(toast, "error");
      server.use(
        http.post("*/functions/v1/checkin/scan", () =>
          HttpResponse.json(
            {
              code: "FORBIDDEN",
              message: "Staff is not assigned to this event.",
              details: null,
              hint: null,
            },
            { status: 403 },
          ),
        ),
      );

      try {
        const user = userEvent.setup();
        renderWithProviders(<StaffScanPage />, "/staff");

        expect(
          await screen.findByText("Annual Gala 2026", undefined, {
            timeout: 5000,
          }),
        ).toBeInTheDocument();

        const input = screen.getByPlaceholderText(
          /paste or enter signed qr token/i,
        );
        await user.type(input, "unassigned-staff-token");
        await user.click(screen.getByRole("button", { name: /^scan$/i }));

        await waitFor(() => {
          expect(
            screen.getByText(/staff is not assigned to this event\./i),
          ).toBeInTheDocument();
        });
        expect(errorSpy).not.toHaveBeenCalled();
      } finally {
        errorSpy.mockRestore();
      }
    });

    it("handles 200 accepted, 200 duplicate, 200 invalid token, 422 wrong event, 422 invalid QR, and 403 unauthorized in scanResultReducer", () => {
      const resolving = scanResultReducer(initialScanState, {
        type: "SCAN_START",
        token: "tok-123",
      });
      expect(resolving.status).toBe("resolving");

      const accepted = scanResultReducer(resolving, {
        type: "SCAN_RESOLVED_SUCCESS",
        payload: {
          result: "accepted",
          attendee: null,
          checked_in_at: "2026-12-15T18:05:00Z",
          message: "Welcome",
        },
      });
      expect(accepted.status).toBe("success");

      const duplicate = scanResultReducer(resolving, {
        type: "SCAN_RESOLVED_ALREADY_CHECKED_IN",
        payload: {
          result: "already_checked_in",
          attendee: null,
          checked_in_at: "2026-12-15T18:00:00Z",
          message: "Already checked in",
        },
      });
      expect(duplicate.status).toBe("already-checked-in");

      const invalidToken200 = scanResultReducer(resolving, {
        type: "SCAN_FAILED_INVALID_TOKEN",
        message: "Invalid token",
      });
      expect(invalidToken200.status).toBe("invalid-token");

      const wrongEvent422 = scanResultReducer(resolving, {
        type: "SCAN_FAILED_WRONG_EVENT",
        expectedEvent: "Annual Gala 2026",
        message: "EVENT_MISMATCH",
      });
      expect(wrongEvent422.status).toBe("wrong-event");

      const invalidQr422 = scanResultReducer(resolving, {
        type: "SCAN_FAILED_INVALID_TOKEN",
        message: "INVALID_QR_TOKEN",
      });
      expect(invalidQr422.status).toBe("invalid-token");

      const unauthorized403 = scanResultReducer(resolving, {
        type: "SCAN_FAILED_UNAUTHORIZED",
        message: "Not assigned to this event",
      });
      expect(unauthorized403.status).toBe("unauthorized");
    });
  });
});

# Organizer Portal — Mockup Implementation Plan

> **Purpose:** The Event Organizer's workspace — create/manage events, build guest lists, review approvals, configure reminders, upload invitation designs, run check-in, and manage Check-in Staff.

## 1. What this mockup covers

A single interactive `index.html` simulating every Organizer route from the main [`README.md`](../../README.md) §8:

| Route (README §8) | Feature |
|---|---|
| `/organizer/events` | List + create events |
| `/organizer/events/:id` | Event overview/edit (capacity, RSVP deadline, visibility mode, status) |
| `/organizer/events/:id/guests` | Build/import guest list |
| `/organizer/events/:id/reminders` | Configure scheduled reminders |
| `/organizer/events/:id/approvals` | Attendee approval queue + headcount-request queue |
| `/organizer/events/:id/design` | Invitation design upload (gallery / HTML) |
| `/organizer/events/:id/attendance` | Live attendance-tracking dashboard |
| `/organizer/events/:id/checkin` | Active scanning screen |
| `/organizer/events/:id/staff` | Manage Check-in Staff assignments |
| `/organizer/profile` | Edit own profile |

## 2. Design system to apply (from [`DESIGN.md`](../DESIGN.md))

- **Layout:** desktop-first with responsive fallback; left sidebar nav (Tertiary `#0F172A` background) + content area.
- **Primary Indigo `#4F46E5`** for main actions; **Secondary Teal `#008A88`** for RSVP/invitation accents.
- **Semantic colors** for statuses: Green = confirmed/approved, Amber = pending, Red = declined/over-capacity.
- **RSVP status chips** (4px radius) map to `Invitation.status`: `accepted` (green), `tentative`/`pending` (amber), `declined` (red), `waitlisted` (amber/neutral).
- **RSVP progress bar** (custom component, Indigo) — % responded vs. total guest list.
- **Tables:** border-bottom `#E2E8F0` between rows, 8px vertical padding, no alternating row colors.
- **Cards:** 12px radius, white, 1px `#E2E8F0` border.

## 3. Screen structure (single-page, sidebar-driven)

The `index.html` uses a left sidebar nav with a vanilla-JS view switcher. Views:

1. **Events list** — event cards (title, date, status chip, RSVP progress bar) + "Create event" button.
2. **Create/edit event** — form: title, slug, description, capacity, RSVP deadline, visibility mode (`open_registration` / `invite_only`), status lifecycle (`draft → published → closed → archived`).
3. **Guests** — guest list table + "import" simulation.
4. **Reminders** — `ReminderSchedule` rows (T-7, T-1, time-of-day, enabled toggle).
5. **Approvals** — two queues: pending Attendees (approve/reject per row) and pending Headcount Increase Requests. Approve-over-capacity shows a **soft-check warning** (amber/red) with an audited override.
6. **Design** — gallery manager vs. HTML uploader, with `validation_status` states (`pending` / `passed` / `failed` + `validation_notes`).
7. **Attendance** — live expected-vs-checked-in counts + searchable attendee list.
8. **Check-in** — active scanning screen (simulated QR scan + manual search).
9. **Staff** — `CheckInAssignment` list (invite by email, revoke).
10. **Profile** — edit own organizer profile.

## 4. Interactivity (vanilla JS)

- Sidebar navigation switching between the 10 views.
- Create-event form with validation (capacity > 0, deadline ≤ start time).
- Approve/reject buttons that update attendee status chips and the RSVP progress bar.
- Capacity soft-check: approving past capacity triggers a warning modal (audited override).
- Design upload: simulate `pending → passed/failed` validation states.
- Attendance dashboard: simulated realtime count updates.

## 5. How to start the mockup flow

1. Start from `MockupPlan/LandingPage/index.html`.
2. Click the **Organizer** role card → simulated Google Sign-In → lands on this portal's `index.html`.
3. Alternatively open `MockupPlan/Organizer Portal/index.html` directly.

## 6. Files to create in this folder

- `index.html` — the interactive organizer mockup (to be built next).
- `README.md` — this plan.

## 7. Acceptance checklist

- [ ] All 10 views reachable from the sidebar.
- [ ] RSVP status chips + progress bar match `DESIGN.md`.
- [ ] Approval queue demonstrates soft-check over-capacity warning.
- [ ] Design upload shows `pending/passed/failed` validation states.
- [ ] Desktop-first layout with responsive fallback.
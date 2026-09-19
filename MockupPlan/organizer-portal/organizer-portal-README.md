# Organizer Portal — Mockup

> **Purpose:** The Event Organizer's workspace — create/manage events, build guest lists, review approvals, configure reminders, upload invitation designs, run check-in, and manage Check-in Staff. This is the deepest and most feature-complete portal in the mockup set.

## 1. What this mockup covers

A single interactive `organizer-portal.html` simulating every Organizer route from the main [`README.md`](../../README.md) §8, plus additional operational views (waitlist, email log, audit log).

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

## 2. Design system applied (from [`design.md`](../design.md))

- **Layout:** desktop-first with responsive fallback; left sidebar nav (Tertiary `#0F172A` background) + content area.
- **Primary Indigo `#4F46E5`** for main actions; **Secondary Teal `#0D9488`** for RSVP/invitation accents.
- **Semantic colors** for statuses: Green = confirmed/approved, Amber = pending, Red = declined/over-capacity.
- **RSVP status chips** (4px radius) map to `Invitation.status`: `accepted` (green), `tentative`/`pending` (amber), `declined` (red), `waitlisted` (amber/neutral).
- **RSVP progress bar** (custom component, Indigo) — % responded vs. total guest list.
- **Tables:** border-bottom `#E2E8F0` between rows, 8px vertical padding, no alternating row colors.
- **Cards:** 12px radius, white, 1px `#E2E8F0` border.

## 3. Screen structure (single-page, dual-sidebar)

The `organizer-portal.html` uses a **dual sidebar** layout: a primary sidebar for global navigation (Events, Notifications, Profile) and a secondary sub-sidebar for event-scoped views. A vanilla-JS view switcher drives all panes.

**Global views:**
1. **Events list** — event cards (title, date, status chip, RSVP progress bar) + "Create event" button.
2. **Notifications** — a notification feed with unread/read states.
3. **Profile** — edit own organizer profile.

**Event-scoped views (sub-sidebar):**
4. **Event overview** — breadcrumbs, event header, action dropdown (edit/publish/archive), metric cards (RSVP, capacity, checked-in), RSVP breakdown, and a live activity feed.
5. **Create event wizard** — a 4-step stepper (details → logistics → settings → review) with validation.
6. **Guests** — guest list table with CSV-import simulation and manual add (modal).
7. **Approvals** — two queues: pending Attendees (approve/reject per row) and pending Headcount Increase Requests. Approve-over-capacity shows a **soft-check warning** (amber/red) with an audited override modal.
8. **Reminders** — `ReminderSchedule` rows (T-7, T-1, time-of-day, enabled toggle).
9. **Design** — gallery manager vs. HTML uploader, with `validation_status` states (`pending` / `passed` / `failed` + `validation_notes`).
10. **Attendance** — live expected-vs-checked-in counts + searchable attendee feed.
11. **Staff** — `CheckInAssignment` list (invite by email via modal, revoke).
12. **Check-in** — active scanning screen (simulated QR scan + manual search) with a link to the Staff Portal.
13. **Waitlist** — FIFO waitlist with position, auto-promotion simulation, and manual promote.
14. **Email log** — sent-email audit trail.
15. **Audit log** — audited actions trail (approvals, overrides, staff changes).

### Mockup extensions (beyond README §8 sitemap)

The following three views are **additive mockup extensions** that reflect the README data model but are not yet enumerated in the §8 sitemap. They will be folded into the sitemap in the next spec revision:

- **Waitlist** — strict FIFO promotion queue (aligns with the capacity/waitlist domain rule).
- **Email log** — transactional `EmailLog` viewer (aligns with the email/audit data model).
- **Audit log** — append-only immutable `AuditLogEntry` ledger (aligns with the audit data model).

## 4. Shared runtime integration

This portal loads the shared runtime [`eirmis.js`](../assets/eirmis.js) and design system [`eirmis.css`](../assets/eirmis.css):

- **Global navigation bar** — cross-portal chrome injected at the top.
- **Session management** — preset user switching and sign-out, persisted to `localStorage`.
- **Boot loading shimmer** — branded loading overlay on first load.
- **Toast notifications** — production toasts with progress bars, icons, and auto-dismiss.
- **Cross-portal state sync** — organizer actions (approvals, capacity overrides, check-in) write to the shared store so the Guest and Staff portals reflect the same data.

## 5. Production-ready behaviors

- **Dual-sidebar navigation** — global + event-scoped views with active-state highlighting.
- **Create-event wizard** — 4-step stepper with per-step validation (capacity > 0, deadline ≤ start time).
- **Approval queue** — approve/reject updates attendee status chips and the RSVP progress bar; over-capacity approval triggers an audited soft-check override modal.
- **Design validation** — simulate `pending → passed/failed` states with validation notes.
- **Waitlist FIFO** — position tracking and auto-promotion when capacity frees up.
- **Attendance dashboard** — simulated realtime count updates.
- **Modals** — capacity override, add-guest, and assign-staff modals with focus management.
- **Accessibility** — ARIA roles on dialogs/menus, `:focus-visible` rings, keyboard-operable controls.
- **Responsive** — desktop-first with a responsive fallback.

## 6. How to run the mockup flow

1. Start from `MockupPlan/landing/landing.html`.
2. Click the **Organizer** role card → simulated Google Sign-In → lands on this portal's `organizer-portal.html`.
3. Alternatively open `MockupPlan/organizer-portal/organizer-portal.html` directly.

## 7. Files in this folder

- `organizer-portal.html` — the interactive organizer mockup.
- `organizer-portal-README.md` — this documentation.

## 8. Acceptance checklist

- [x] All 15 views reachable from the dual sidebar.
- [x] RSVP status chips + progress bar match `design.md`.
- [x] Approval queue demonstrates soft-check over-capacity warning.
- [x] Design upload shows `pending/passed/failed` validation states.
- [x] Waitlist FIFO promotion and audit/email logs present.
- [x] Desktop-first layout with responsive fallback.
- [x] Shared runtime provides global nav, session switching, toasts, and cross-portal sync.
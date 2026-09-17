# Check-in Staff Portal — Mockup

> **Purpose:** The Check-in Staff's scoped, event-day-only scanning surface. A staff member can scan/search and check in attendees for **one assigned event only**, with no access to guest lists, RSVP details, or invitation designs.

## 1. What this mockup covers

A single interactive `index.html` simulating the Check-in Staff route from the main [`README.md`](../../README.md) §8:

| Route (README §8) | Feature |
|---|---|
| `/staff/events/:eventId/checkin` | Scoped scanning screen for the one assigned event |

## 2. Design system applied (from [`DESIGN.md`](../DESIGN.md))

- **Layout:** **mobile-first** (staff scan at the event entrance on a phone).
- **Primary Indigo `#4F46E5`** for the scan action; **Secondary Teal `#0D9488`** for success accents.
- **Semantic colors** for scan results: Green = accepted/checked-in, Amber = duplicate, Red = rejected.
- **Cards:** 12px radius, white, 1px `#E2E8F0` border.
- **Inputs:** 8px radius, `#E2E8F0` border, 2px Indigo focus ring.

## 3. Screen structure (single-page, mobile-first)

1. **Scanning screen** — a simulated QR scan area (camera viewfinder with a scan reticle) + manual name/email search fallback.
2. **Scan result panel** — a state machine mirroring `ScannerContext` from README §9:
   - `idle → scanning → resolving → accepted / duplicate / rejected`
3. **Walk-in** — create an ad hoc attendee (`is_walk_in = true`) with no prior roster entry.
4. **Attendance summary** — expected vs. checked-in counts for the assigned event (read-only).

## 4. Shared runtime integration

This portal loads the shared runtime [`eirmis.js`](../assets/eirmis.js) and design system [`eirmis.css`](../assets/eirmis.css):

- **Global navigation bar** — cross-portal chrome injected at the top.
- **Session management** — preset user switching and sign-out, persisted to `localStorage`.
- **Boot loading shimmer** — branded loading overlay on first load.
- **Toast notifications** — production toasts with progress bars, icons, and auto-dismiss.
- **Cross-portal state sync** — check-ins and walk-ins write to the shared store, so the Organizer's attendance dashboard reflects the same counts.

## 5. Production-ready behaviors

- **Scan state machine** — a simulated scan button cycles through result states (accepted / duplicate / rejected) with a brief `resolving` delay.
- **Manual search** — a search input filters a small attendee list.
- **Walk-in form** — adds a row and increments the checked-in count.
- **Result indicators** — semantic colors (green/amber/red) with an `aria-live` region for screen readers.
- **Accessibility** — `:focus-visible` rings, keyboard-operable controls, live-region announcements.
- **Responsive** — mobile-first layout.

## 6. Important boundary to document (from README §6/§9)

Check-in Staff have **scanning/search only** for their single assigned event. The mockup must **not** include guest lists, RSVP details, approval queues, or invitation designs. The `CheckInAssignment` lifecycle (`invited → active → revoked`) can be shown as a small status indicator.

## 7. How to run the mockup flow

1. Start from `MockupPlan/LandingPage/index.html`.
2. Click the **Check-in Staff** role card → `/staff/login` → "magic link sent" → lands on this portal's `index.html`.
3. Alternatively open `MockupPlan/Check-in Staff Portal/index.html` directly.

## 8. Files in this folder

- `index.html` — the interactive check-in staff mockup.
- `README.md` — this documentation.

## 9. Acceptance checklist

- [x] Scanning screen with manual search fallback.
- [x] Scan result state machine (accepted / duplicate / rejected) with semantic colors.
- [x] Walk-in creation increments checked-in count.
- [x] No guest-list/RSVP/design screens present (respects the access boundary).
- [x] Mobile-first layout.
- [x] Shared runtime provides global nav, session switching, toasts, and cross-portal sync.
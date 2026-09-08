# Check-in Staff Portal — Mockup Implementation Plan

> **Purpose:** The Check-in Staff's scoped, event-day-only scanning surface. A staff member can scan/search and check in attendees for **one assigned event only**, with no access to guest lists, RSVP details, or invitation designs.

## 1. What this mockup covers

A single interactive `index.html` simulating the Check-in Staff route from the main [`README.md`](../../README.md) §8:

| Route (README §8) | Feature |
|---|---|
| `/staff/events/:eventId/checkin` | Scoped scanning screen for the one assigned event |

## 2. Design system to apply (from [`DESIGN.md`](../DESIGN.md))

- **Layout:** **mobile-first** (staff scan at the event entrance on a phone).
- **Primary Indigo `#4F46E5`** for the scan action; **Secondary Teal `#008A88`** for success accents.
- **Semantic colors** for scan results: Green = accepted/checked-in, Amber = duplicate, Red = rejected.
- **Cards:** 12px radius, white, 1px `#E2E8F0` border.
- **Inputs:** 8px radius, `#E2E8F0` border, 2px Indigo focus ring.

## 3. Screen structure (single-page, mobile-first)

1. **Scanning screen** — a simulated QR scan area + manual name/email search fallback.
2. **Scan result panel** — a state machine mirroring `ScannerContext` from README §9:
   - `idle → scanning → resolving → accepted / duplicate / rejected`
3. **Walk-in** — create an ad hoc attendee (`is_walk_in = true`) with no prior roster entry.
4. **Attendance summary** — expected vs. checked-in counts for the assigned event (read-only).

## 4. Interactivity (vanilla JS)

- Simulated scan button that cycles through result states (accepted / duplicate / rejected).
- Manual search input that filters a small attendee list.
- Walk-in form (name) that adds a row and increments checked-in count.
- Result indicators use semantic colors (green/amber/red).

## 5. Important boundary to document (from README §6/§9)

Check-in Staff have **scanning/search only** for their single assigned event. The mockup must **not** include guest lists, RSVP details, approval queues, or invitation designs. The `CheckInAssignment` lifecycle (`invited → active → revoked`) can be shown as a small status indicator.

## 6. How to start the mockup flow

1. Start from `MockupPlan/LandingPage/index.html`.
2. Click the **Check-in Staff** role card → `/staff/login` → "magic link sent" → lands on this portal's `index.html`.
3. Alternatively open `MockupPlan/Check-in Staff Portal/index.html` directly.

## 7. Files to create in this folder

- `index.html` — the interactive check-in staff mockup (to be built next).
- `README.md` — this plan.

## 8. Acceptance checklist

- [ ] Scanning screen with manual search fallback.
- [ ] Scan result state machine (accepted / duplicate / rejected) with semantic colors.
- [ ] Walk-in creation increments checked-in count.
- [ ] No guest-list/RSVP/design screens present (respects the access boundary).
- [ ] Mobile-first layout.
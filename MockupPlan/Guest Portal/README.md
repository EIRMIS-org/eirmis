# Guest Portal — Mockup Implementation Plan

> **Purpose:** The Guest's self-service portal — manage RSVP, submit the attendee roster, request additional heads, and download QR codes. Authenticated via passwordless magic link.

## 1. What this mockup covers

A single interactive `index.html` simulating the Guest routes from the main [`README.md`](../../README.md) §8:

| Route (README §8) | Feature |
|---|---|
| `/guest/dashboard` | Cross-event list of the guest's invitations |
| `/guest/events/:eventId` | Invitation details, RSVP status, invitation design view |
| `/guest/events/:eventId/attendees` | Roster submission + per-attendee status |
| `/guest/events/:eventId/request-heads` | Headcount increase request |
| `/guest/events/:eventId/qr` | Download party QR PDF |

## 2. Design system to apply (from [`DESIGN.md`](../DESIGN.md))

- **Layout:** **mobile-first** (guests RSVP on the go), single-column stacked.
- **Primary Indigo `#4F46E5`** for RSVP actions; **Secondary Teal `#008A88`** for invitation/RSVP accents.
- **RSVP status chips** (4px radius): `accepted` (green), `tentative`/`pending` (amber), `declined` (red), `waitlisted` (amber/neutral).
- **Cards:** 12px radius, white, 1px `#E2E8F0` border.
- **Inputs:** 8px radius, `#E2E8F0` border, 2px Indigo focus ring.

## 3. Screen structure (single-page, mobile-first)

1. **Dashboard** — list of the guest's invitations across events (event name, date, RSVP status chip).
2. **Event detail** — invitation design view (gallery lightbox **or** sandboxed HTML frame) + RSVP action buttons (Accept / Decline / Tentative).
3. **Attendees** — roster submission: the primary guest is auto-listed as `Attendee #1` (approved); add up to `max_party_size − 1` additional attendees (name required, email optional/non-unique). Per-attendee status chips.
4. **Request heads** — form to request additional heads (number + optional note), only when already at `max_party_size`.
5. **QR** — download the party's QR PDF (simulated).

## 4. Interactivity (vanilla JS)

- Navigation between the five views.
- RSVP action buttons update the status chip.
- Roster form: enforce `max_party_size` ceiling client-side (block a 5th attendee when max is 4).
- Attendee status chips reflect `pending / approved / rejected`.
- Headcount request form (disabled unless at max party size).
- QR download button (simulated).

## 5. How to start the mockup flow

1. Start from `MockupPlan/LandingPage/index.html`.
2. Click the **Guest** role card → `/guest/login` → "magic link sent" → lands on this portal's `index.html`.
3. Alternatively open `MockupPlan/Guest Portal/index.html` directly.

## 6. Files to create in this folder

- `index.html` — the interactive guest mockup (to be built next).
- `README.md` — this plan.

## 7. Acceptance checklist

- [ ] All five views reachable.
- [ ] RSVP status chips match `DESIGN.md` semantic colors.
- [ ] Roster enforces `max_party_size` ceiling.
- [ ] Mobile-first, single-column layout.
- [ ] No external dependencies.
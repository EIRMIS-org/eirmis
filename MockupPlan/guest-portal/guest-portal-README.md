# Guest Portal — Mockup

> **Purpose:** The Guest's self-service portal — manage RSVP, submit the attendee roster, request additional heads, and download QR codes. Authenticated via passwordless magic link.

## 1. What this mockup covers

A single interactive `guest-portal.html` simulating the Guest routes from the main [`README.md`](../../README.md) §8:

| Route (README §8) | Feature |
|---|---|
| `/guest/dashboard` | Cross-event list of the guest's invitations |
| `/guest/events/:eventId` | Invitation details, RSVP status, invitation design view |
| `/guest/events/:eventId/attendees` | Roster submission + per-attendee status |
| `/guest/events/:eventId/request-heads` | Headcount increase request |
| `/guest/events/:eventId/qr` | Download party QR PDF |

## 2. Design system applied (from [`design.md`](../design.md))

- **Layout:** **mobile-first** (guests RSVP on the go), single-column stacked.
- **Primary Indigo `#4F46E5`** for RSVP actions; **Secondary Teal `#0D9488`** for invitation/RSVP accents.
- **RSVP status chips** (4px radius): `accepted` (green), `tentative`/`pending` (amber), `declined` (red), `waitlisted` (amber/neutral).
- **Cards:** 12px radius, white, 1px `#E2E8F0` border.
- **Inputs:** 8px radius, `#E2E8F0` border, 2px Indigo focus ring.

## 3. Screen structure (single-page, mobile-first)

1. **Dashboard** — list of the guest's invitations across events (event name, date, RSVP status chip), plus a hero card and segmented tabs.
2. **Event detail** — invitation design view (gallery lightbox) + RSVP action buttons (Accept / Decline / Tentative) with a party-size selector.
3. **Attendees** — roster submission: the primary guest is auto-listed as `Attendee #1` (approved); add up to `max_party_size − 1` additional attendees (name required, email optional/non-unique). Per-attendee status chips, a quota bar, and a rejected-attendee resubmit flow.
4. **Request heads** — form to request additional heads (number + optional note), only when already at `max_party_size`.
5. **QR** — a wallet-style QR pass for the party, with a simulated PDF download.

## 4. Shared runtime integration

This portal loads the shared runtime [`eirmis.js`](../assets/eirmis.js) and design system [`eirmis.css`](../assets/eirmis.css):

- **Global navigation bar** — cross-portal chrome injected at the top.
- **Session management** — preset user switching and sign-out, persisted to `localStorage`.
- **Boot loading shimmer** — branded loading overlay on first load.
- **Toast notifications** — production toasts with progress bars, icons, and auto-dismiss.
- **Cross-portal state sync** — RSVP changes and roster submissions write to the shared store, so the Organizer's guest list and approval queue reflect the same data.

## 5. Production-ready behaviors

- **RSVP selector** — Accept / Decline / Tentative buttons update the status chip and party size.
- **Roster ceiling** — enforce `max_party_size` client-side (block a 5th attendee when max is 4) with a quota bar.
- **Rejected resubmit** — a rejected attendee can edit and resubmit their details.
- **Headcount request** — form disabled unless at max party size, with a success notice.
- **Wallet QR pass** — a styled QR pass with a simulated PDF download.
- **Gallery lightbox** — invitation design gallery with a lightbox dialog.
- **Accessibility** — ARIA roles on dialogs, `:focus-visible` rings, keyboard-operable controls.
- **Responsive** — mobile-first, single-column layout.

## 6. How to run the mockup flow

1. Start from `MockupPlan/landing/landing.html`.
2. Click the **Guest** role card → `/guest/login` → "magic link sent" → lands on this portal's `guest-portal.html`.
3. Alternatively open `MockupPlan/guest-portal/guest-portal.html` directly.

## 7. Files in this folder

- `guest-portal.html` — the interactive guest mockup.
- `guest-portal-README.md` — this documentation.

## 8. Acceptance checklist

- [x] All five views reachable.
- [x] RSVP status chips match `design.md` semantic colors.
- [x] Roster enforces `max_party_size` ceiling.
- [x] Rejected-attendee resubmit flow present.
- [x] Mobile-first, single-column layout.
- [x] No external dependencies.
- [x] Shared runtime provides global nav, session switching, toasts, and cross-portal sync.
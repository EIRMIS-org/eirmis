# LandingPage — Mockup Implementation Plan

> **Purpose:** The public entry surface of EIRMIS. This is the first screen a user sees and the hub that routes them into one of the four portals (Organizer, Admin, Guest, Check-in Staff).

## 1. What this mockup covers

This folder will contain a single interactive `index.html` that simulates the **Public / Auth** surface from the main [`README.md`](../../README.md) §8:

| Route (from README §8) | What the mockup simulates |
|---|---|
| `/` (landing) | Hero, product pitch, role-based entry cards |
| `/login` | Organizer/Admin Google Sign-In (any Google account) |
| `/pending-verification` | Organizer awaiting admin activation |
| `/guest/login` | Guest email → "magic link sent" state |
| `/staff/login` | Check-in Staff email → "magic link sent" state |
| `/register/:slug` | Public open-registration form (unauthenticated) |

## 2. Design system to apply (from [`DESIGN.md`](../DESIGN.md))

- **Brand:** Modern SaaS Minimalism — professional, efficient, enterprise-ready.
- **Primary:** Indigo `#4F46E5` (main CTA, active states, brand).
- **Secondary:** Teal `#008A88` (invitation/RSVP accents).
- **Tertiary/Dark:** `#0F172A` (nav/header backgrounds).
- **Neutrals:** Slate grays (`#E2E8F0` borders, `#64748B` ghost text).
- **Typography:** Hanken Grotesk (headings) + Inter (body). Page heading 32px desktop / 24px mobile.
- **Shapes:** cards 12px radius, buttons/inputs 8px, badges 4px.
- **Elevation:** background `#F8FAFC`, cards `#FFFFFF` + 1px `#E2E8F0` border.
- **Layout:** 8px grid, 12-column desktop → single-column mobile, 24px desktop gutter / 16px mobile.

## 3. Screen structure (single-page, tab/state-driven)

The `index.html` will be a single page with a lightweight vanilla-JS "view router" (show/hide sections) so no build step is needed:

1. **Hero / landing view** — headline, subhead, and four role entry cards:
   - Organizer → opens the `/login` view
   - Admin → opens the `/login` view (same Google Sign-In)
   - Guest → opens `/guest/login` view
   - Check-in Staff → opens `/staff/login` view
2. **Login view** — "Continue with Google" button (simulated), plus a note that any Google account works (no domain restriction).
3. **Pending-verification view** — shown when a simulated organizer is not yet `active`.
4. **Guest login view** — email input → "Send magic link" → success state ("Check your inbox").
5. **Staff login view** — same as guest, but labeled for Check-in Staff.
6. **Open-registration view** — public form (name, email, party size) that simulates creating an `accepted` invitation.

## 4. Interactivity (vanilla JS, no framework)

- Tab/view switching between the six views above.
- Form validation (email format, required fields) with inline error states using the design system's error color `#BA1A1A`.
- Simulated "magic link sent" success state with a toast/confirmation.
- Each role card links (visually) to the corresponding portal folder — for now a placeholder link/note, since the other portals are separate mockups.

## 5. How to start the mockup flow

1. Open `MockupPlan/LandingPage/index.html` in a browser (double-click, or `npm run dev`-style static serve).
2. The landing page is the **entry point** — every other portal is reached from here.
3. From the landing page, clicking a role card simulates the auth step, then (in the full mockup set) hands off to that portal's own `index.html`.

## 6. Files to create in this folder

- `index.html` — the interactive landing/auth mockup (to be built next).
- `README.md` — this plan.

## 7. Acceptance checklist

- [ ] All six views reachable from the landing page.
- [ ] Design tokens (colors, radii, typography) match `DESIGN.md`.
- [ ] Responsive: single-column on mobile, 12-column on desktop.
- [ ] No external dependencies; opens directly in a browser.
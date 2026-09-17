# LandingPage — Public Hub & Auth Mockup

> **Purpose:** The public entry surface of EIRMIS. This is the first screen a user sees and the hub that routes them into one of the four portals (Organizer, Admin, Guest, Check-in Staff). It also simulates the full authentication surface — Google Sign-In, passwordless magic links, pending-verification, and public open registration.

## 1. What this mockup covers

A single interactive `index.html` that simulates the **Public / Auth** surface from the main [`README.md`](../../README.md) §8. All routes are implemented as a lightweight hash/view router with no build step.

| Route (from README §8) | What the mockup simulates |
|---|---|
| `/` (landing) | Hero, product pitch, role-based entry cards |
| `/login` | Organizer/Admin Google Sign-In (any Google account) |
| `/pending-verification` | Organizer awaiting admin activation |
| `/guest/login` | Guest email → "magic link sent" state |
| `/staff/login` | Check-in Staff email → "magic link sent" state |
| `/register/:slug` | Public open-registration form (unauthenticated) |

## 2. Design system applied (from [`DESIGN.md`](../DESIGN.md))

- **Brand:** Modern SaaS Minimalism — professional, efficient, enterprise-ready.
- **Primary:** Indigo `#4F46E5` (main CTA, active states, brand).
- **Secondary:** Teal `#0D9488` (invitation/RSVP accents).
- **Tertiary/Dark:** `#0F172A` (nav/header backgrounds).
- **Neutrals:** Slate grays (`#E2E8F0` borders, `#64748B` ghost text).
- **Typography:** Hanken Grotesk (headings) + Inter (body). Page heading 32px desktop / 24px mobile.
- **Shapes:** cards 12px radius, buttons/inputs 8px, badges 4px.
- **Elevation:** background `#F8FAFC`, cards `#FFFFFF` + 1px `#E2E8F0` border.
- **Layout:** 8px grid, 12-column desktop → single-column mobile, 24px desktop gutter / 16px mobile.

## 3. Screen structure (single-page, view-driven)

The `index.html` is a single page with a vanilla-JS view router (show/hide sections):

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

## 4. Shared runtime integration

This portal loads the shared runtime [`eirmis.js`](../assets/eirmis.js) and design system [`eirmis.css`](../assets/eirmis.css), giving it production-grade behaviors out of the box:

- **Global navigation bar** — cross-portal chrome injected at the top, letting you jump between all 5 portals.
- **Session management** — preset user switching (Organizer / Admin / Guest / Staff) and sign-out, persisted to `localStorage`.
- **Boot loading shimmer** — a branded loading overlay on first load.
- **Toast notifications** — production toasts with progress bars, icons, and auto-dismiss.
- **Cross-portal state sync** — auth/session state is shared with the other portals via the shared store.

## 5. Production-ready behaviors

- **View routing** — hash-based deep linking so each view is directly addressable (e.g. `#login`, `#guest/login`).
- **Form validation** — email format and required-field checks with inline error states using the design system's error color `#B91C1C`.
- **Simulated async auth** — magic-link and sign-in flows show a brief loading state before resolving, mirroring a real network round-trip.
- **Accessibility** — ARIA labels on interactive elements, `:focus-visible` rings, and keyboard-operable controls.
- **Responsive** — single-column on mobile, 12-column on desktop.

## 6. How to run the mockup flow

1. Open `MockupPlan/LandingPage/index.html` in a browser (double-click, or serve statically with `npx serve` / `npm run dev`).
2. The landing page is the **entry point** — every other portal is reached from here.
3. From the landing page, clicking a role card simulates the auth step, then hands off to that portal's own `index.html`.

## 7. Files in this folder

- `index.html` — the interactive landing/auth mockup.
- `README.md` — this documentation.

## 8. Acceptance checklist

- [x] All six views reachable from the landing page.
- [x] Design tokens (colors, radii, typography) match `DESIGN.md`.
- [x] Responsive: single-column on mobile, 12-column on desktop.
- [x] No external dependencies; opens directly in a browser.
- [x] Shared runtime provides global nav, session switching, toasts, and boot overlay.
- [x] Hash-based deep linking for each view.
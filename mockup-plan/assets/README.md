# MockupPlan/assets — Shared Runtime & Design System

> **Purpose:** The shared foundation that powers all 5 EIRMIS portals. This folder contains the cross-portal runtime ([`eirmis.js`](eirmis.js)) and the authoritative design system ([`eirmis.css`](eirmis.css)). Every portal `index.html` loads these two files to get global navigation, session management, toasts, boot loading, and cross-portal state sync.

## 1. Files in this folder

| File | Role |
|---|---|
| [`eirmis.js`](eirmis.js) | Shared runtime — state store, session, global nav, toasts, boot overlay, public `EIRMIS` API |
| [`eirmis.css`](eirmis.css) | Design system — design tokens, global chrome, component primitives, responsive rules |

## 2. How portals use it

Each portal's `index.html` includes both files and calls `EIRMIS.init()` on load:

```html
<link rel="stylesheet" href="../assets/eirmis.css">
<script src="../assets/eirmis.js"></script>
<script>
  EIRMIS.init({ portal: 'organizer' }); // 'landing' | 'organizer' | 'admin' | 'guest' | 'staff'
</script>
```

`EIRMIS.init()` injects the global navigation bar, renders the current session, and shows the boot loading overlay.

## 3. Public API (`EIRMIS` namespace)

| Method | Description |
|---|---|
| `EIRMIS.init(opts)` | Boot the runtime. `opts.portal` sets the active nav highlight. |
| `EIRMIS.toast(message, type)` | Show a toast. `type`: `success` \| `warning` \| `error` \| `info`. |
| `EIRMIS.hideToast()` | Dismiss the current toast. |
| `EIRMIS.signIn(role, name, email)` | Set the active session and persist it. |
| `EIRMIS.switchPresetUser(key)` | Switch to a preset identity (`organizer` \| `admin` \| `guest` \| `staff`). |
| `EIRMIS.signOut()` | Clear the session. |
| `EIRMIS.session()` | Return the current session object. |
| `EIRMIS.getState()` | Return the shared state object (events, organizers, guests, checkedIn). |
| `EIRMIS.save()` | Persist the current state to `localStorage`. |
| `EIRMIS.reset()` | Reset state to the default seed data. |
| `EIRMIS.basePath()` | Resolve the correct relative path prefix for cross-portal links. |

## 4. Shared state & cross-portal sync

The runtime persists a single shared store to `localStorage` under the key **`eirmis.mockup.v2`**. Because all portals read and write the same store, an action in one portal is reflected in the others:

- **Organizer** approves an attendee → **Guest** sees the updated status.
- **Check-in Staff** checks someone in → **Organizer** attendance dashboard count updates.
- **Admin** activates an organizer → the organizer's status is consistent everywhere.

The seed state shape:

```js
{
  session: { role, name, email, initials },
  events:  [{ id, title, slug, venue, date, time, capacity, rsvp, status, visibility }],
  organizers: [{ id, name, email, org, status, registeredAt }],
  guests:  [{ id, name, email, eventId, status, party, maxParty }],
  checkedIn: 48
}
```

> **Note:** This is a mockup store for UI/UX demonstration. In production, this maps to Supabase (Postgres + RLS + Realtime) as described in the main [`README.md`](../../README.md).

## 5. Design tokens (from [`eirmis.css`](eirmis.css))

The CSS defines the authoritative design tokens as custom properties, matching [`design.md`](../design.md):

| Token group | Examples |
|---|---|
| **Brand** | `--primary: #4F46E5`, `--secondary: #0D9488` |
| **Dark neutrals** | `--dark: #0F172A`, `--dark-surface: #1E293B` |
| **Cool neutrals** | `--bg: #F8FAFC`, `--surface: #FFFFFF`, `--border: #E2E8F0`, `--text-main: #0F172A` |
| **Semantic status** | `--success`, `--warning`, `--error`, `--info` (each with `-bg`/`-border` variants) |
| **Radii** | `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 18px`, `--radius-pill: 9999px` |
| **Elevation** | `--shadow-xs` → `--shadow-float` |
| **Typography** | `--font-heading` (Hanken Grotesk), `--font-body` (Inter) |

## 6. Component primitives

`eirmis.css` also provides reusable classes used across portals:

- **Buttons** — `.eirmis-btn`, `.eirmis-btn-primary`, `.eirmis-btn-secondary`, `.eirmis-btn-teal`, `.eirmis-btn-danger`, `.eirmis-btn-ghost`, `.eirmis-btn-sm`
- **Status chips** — `.eirmis-chip`, `.eirmis-chip-green`, `.eirmis-chip-amber`, `.eirmis-chip-red`, `.eirmis-chip-blue`, `.eirmis-chip-slate`
- **Skeleton loader** — `.eirmis-skeleton` (shimmer animation)
- **Empty state** — `.eirmis-empty`, `.eirmis-empty-icon`, `.eirmis-empty-title`, `.eirmis-empty-desc`
- **Global nav** — `.eirmis-global-nav`, `.eirmis-nav-link`, `.eirmis-session-pill`, `.eirmis-nav-signout`
- **Toast** — `.eirmis-toast` with `.success` / `.warning` / `.error` / `.info` variants and a progress bar

## 7. Accessibility

- Global `:focus-visible` outline (WCAG 2.4.7) on all interactive elements.
- Toast close button has an `aria-label`.
- Session pill exposes the signed-in email via `title`.
- Responsive rules collapse the nav links on small screens (`@media (max-width: 768px)`).

## 8. Adding a new portal

To hook a new portal into the shared runtime:

1. Create the portal folder with an `index.html`.
2. Link `../assets/eirmis.css` and `../assets/eirmis.js`.
3. Call `EIRMIS.init({ portal: 'your-key' })`.
4. Add the portal to the `PORTALS` array in [`eirmis.js`](eirmis.js) so it appears in the global nav.
5. Use `EIRMIS.getState()` / `EIRMIS.save()` to read and persist shared data.

## 9. Acceptance checklist

- [x] All portals load the shared runtime and design system.
- [x] Cross-portal state sync works via the shared `localStorage` store.
- [x] Design tokens match `design.md`.
- [x] Global nav, session switching, toasts, and boot overlay are available to every portal.
- [x] No external dependencies; opens directly in a browser.
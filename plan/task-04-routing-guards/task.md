# Task 04 — Routing & Role Guards

| Field | Value |
|---|---|
| **Order** | 4th — after task 03; final Lane A task |
| **Owner** | Andrei (Lead) + Jack |
| **Lane** | A (Infra) — final sequential task: 03 → 04, then Lane D opens |
| **Branch** | `feat/m4-w1-routing-guards` |

---

## Scope

Create the full route table for all five surfaces (landing + 4 portals) and the `RoleGuard` component that protects portal routes. This is the **gate task** for Lane D: no portal work starts until routes + guards exist.

## Route table (from the §7 route map / mockup-plan)

| Path | Element | Guard | Notes |
|---|---|---|---|
| `/` | Landing (task 06) | public | role cards + sign-in entry |
| `/organizer` | Organizer layout (task 07) | `organizer` | events list is the index |
| `/organizer/events/new` | Create-event wizard (task 07) | `organizer` | 4-step wizard |
| `/organizer/events/:eventId` | Event workspace (task 07) | `organizer` | tabs: guests, approvals, reminders, design, check-in, logs |
| `/guest` | Guest portal (task 08) | `guest` | mobile-first |
| `/guest/invitations/:invitationId` | Invitation detail / RSVP (task 08) | `guest` | |
| `/staff` | Check-in portal (task 09) | `checkin` | scan screen is the index |
| `/staff/search` | Manual search / walk-in (task 09) | `checkin` | |
| `/admin` | Admin portal (task 10) | `admin` | verification queue is the index |
| `/admin/settings` | Org settings (task 10) | `admin` | |
| `/docs`, `/styleguide` | Migrated from [`src/App.tsx`](../../src/App.tsx) | public | keep working |
| `*` | 404 | public | simple not-found page |

> Portal devs who need an extra route (e.g. `/organizer/events/:eventId/waitlist`) **request it on the task board** — only the task 04 owner edits [`router.tsx`](../../src/App.tsx) this week. This keeps the conflict map in the [README](../README.md) honest.

## RoleGuard design

```tsx
// src/app/routing/role-guard.tsx
function RoleGuard({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { role, isAuthenticated } = useSession()
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (!allow.includes(role)) return <ForbiddenPage />   // reuse pattern from
                                                        // mockup-plan/organizer-portal/403-unauthorized.html
  return children
}
```

- `ForbiddenPage` lives in `src/app/routing/forbidden-page.tsx` — one shared 403 screen for all portals (the mockup already has the visual reference).
- Guards are declarative in the route table: `<Route element={<RoleGuard allow={['organizer']}><OrganizerLayout/></RoleGuard>}>`.

## Layout slots

Each portal gets a **layout route** with an empty `<Outlet />` and the shared [`global-nav.tsx`](../../src/components/eirmis/global-nav.tsx) chrome. Portal tasks (07–10) fill the outlets — they never touch the router file.

## Steps

1. Create `src/app/routing/router.tsx` with `createBrowserRouter` and the full table above.
2. Create `src/app/routing/role-guard.tsx` and `src/app/routing/forbidden-page.tsx`.
3. Create five layout shells: `src/pages/landing/`, `src/pages/organizer/`, `src/pages/guest/`, `src/pages/staff/`, `src/pages/admin/` — each with a layout component rendering `<Outlet />` inside the portal chrome.
4. Migrate `/docs` and `/styleguide` from [`src/App.tsx`](../../src/App.tsx) into routes; delete the path-check logic from `App.tsx`.
5. Add the 404 route.
6. Verify: signed out → every portal redirects to `/`; wrong role → 403 page; correct role → empty portal shell renders.

## Files touched

- `src/app/routing/router.tsx` — **new**
- `src/app/routing/role-guard.tsx` — **new**
- `src/app/routing/forbidden-page.tsx` — **new**
- `src/pages/{landing,organizer,guest,staff,admin}/` — **new** (layout shells only)
- [`src/App.tsx`](../../src/App.tsx) — modified (becomes `<RouterProvider />`)
- [`src/main.tsx`](../../src/main.tsx) — modified if needed

## Out of scope

- Page content inside portals (tasks 06–10)
- Data fetching in layouts (portal tasks own that)

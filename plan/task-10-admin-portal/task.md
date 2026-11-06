# Task 10 — Admin Portal (Core Flows)

| Field | Value |
|---|---|
| **Order** | After 04 + 05 (settings form also needs 11) |
| **Owner** | Cerna + Edgar (Cerna builds task 11 first, then this) |
| **Lane** | D (Portals) — parallel with 07, 08, 09 |
| **Branch** | `feat/m4-w1-admin-portal` → PR to `feat/m4-frontend` |

---

## Scope

Build the admin's core screens: organizer verification queue (`pending → active`) and org-wide settings. The admin portal is **outside the main checkpoint flow** but demonstrates the zero-knowledge access boundary — it is the first screen shown when the demo needs to prove role isolation.

## Visual contract

[`mockup-plan/admin-portal/admin-portal.html`](../../mockup-plan/admin-portal/admin-portal.html) — verification queue, org settings, zero-knowledge boundary messaging. Reuse [`settings-section.tsx`](../../src/components/eirmis/settings-section.tsx).

## Week-1 page set

| Page / view | Route | Key operations |
|---|---|---|
| Verification queue (index) | `/admin` | `useAdminOrganizers` (paginated), `useUpdateOrganizerStatus` |
| Org settings | `/admin/settings` | `useOrgSettings` (get + update) |

## Key interactions

- **Verification queue:** paginated organizer list with `pending` / `active` / `suspended` status chips; approve → `active`, revoke → `suspended`, with a confirmation dialog for status changes. Pagination via the `page` param (the wrapper's `getAdminOrganizers(page)` already supports it).
- **Org settings:** form over the `OrgSettings` schema (added to the contract in the M2 merge — [`contract/components/schemas/OrgSettings.yaml`](../../contract/components/schemas/OrgSettings.yaml)); save via `useOrgSettings` update mutation with a success toast.
- **Zero-knowledge boundary:** admin views organizer *profiles* only — no event/guest data anywhere in the portal. Enforce visually (no links to event data) and note it in the empty states.
- **Cross-portal visibility (checkpoint-adjacent):** activating a pending organizer flips their status everywhere (MSW shared store).

## Steps

1. Verification queue: paginated table with status chips + the four basic states.
2. Status-change actions with confirmation dialogs → `useUpdateOrganizerStatus`.
3. Org settings page: form from the task 11 `OrgSettings` schema → `useOrgSettings` update.
4. Verify the cross-portal loop: activate a pending organizer → their session/profile reflects `active` in the organizer portal.

## Files touched

- `src/pages/admin/` — fill layout outlets
- `src/features/admin/components/` — **new** (organizer queue table, status dialogs, settings form)
- `src/features/admin/schemas/` — consumed from task 11 (`OrgSettings`)

## Out of scope

- Audit-log viewer for admin (Week 2, if in scope at all)
- Exhaustive states + a11y (Week 2)

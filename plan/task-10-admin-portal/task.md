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

## Developer Import Map

```tsx
// 1. Session Context (from Task 03)
import { useSession } from '@/app/providers/session-context'

// 2. Data Hooks (from Task 05 - src/features/admin/hooks/)
import { useAdminOrganizers } from '@/features/admin/hooks/use-admin-organizers'
import { useUpdateOrganizerStatus } from '@/features/admin/hooks/use-update-organizer-status'
import { useOrgSettings } from '@/features/admin/hooks/use-org-settings'
import { useAdminProfile } from '@/features/admin/hooks/use-admin-profile'

// 3. Forms & Validation (from Task 11 - src/lib/forms/)
import {
  orgSettingsSchema,
  orgSettingsResolver,
  orgSettingsUpdateSchema,
  orgSettingsUpdateResolver,
  FormRow,
  applyContractError,
} from '@/lib/forms'

// 4. Pre-built Domain Components (src/components/eirmis/)
import { SettingsSection } from '@/components/eirmis/settings-section'
import { SettingsRow } from '@/components/eirmis/portal-cards'

// 5. UI Primitives (src/components/ui/)
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
```

## Target File Structure

```
src/
├── pages/
│   └── admin/
│       ├── admin-layout.tsx                 (existing layout shell rendering AppChrome + Outlet)
│       ├── admin-queue-page.tsx             ← NEW: Verification queue & KPI strip ("/admin")
│       └── admin-settings-page.tsx          ← NEW: Org-wide configuration ("/admin/settings")
└── features/
    └── admin/
        └── components/                      ← NEW: Feature components
            ├── kpi-summary-strip.tsx        (KPI counters for pending, active, and total organizers)
            ├── organizer-table.tsx          (Paginated table with status badges & Activate/Suspend actions)
            ├── status-change-dialog.tsx     (Audited confirmation modal for status changes)
            └── org-settings-form.tsx        (Form using orgSettingsUpdateResolver + SettingsSection)
```

## Router Slot Handoff

In [`src/app/routing/router.tsx`](../../src/app/routing/router.tsx):
```tsx
// Replace PlaceholderPage elements under /admin:
{
  path: 'admin',
  element: <AdminQueuePage />,
},
{
  path: 'admin/settings',
  element: <AdminSettingsPage />,
}
```

---

## Detailed Step-by-Step Implementation Guide

1. **KPI Strip & Verification Queue (`admin-queue-page.tsx` + `organizer-table.tsx`)**:
   - URL search param drives pagination: `const [searchParams, setSearchParams] = useSearchParams(); const page = Number(searchParams.get('page') || '0')`.
   - Query: `const { data: organizers, isLoading, isError } = useAdminOrganizers(page)`.
   - KPI Strip shows quick metrics (e.g. pending organizers count).
   - Table displays: Full Name, Email, Status Badge (`pending` in amber, `active` in green, `suspended` in red), Created Date, and Action button:
     - For `pending`: "Activate" button opening `<StatusChangeDialog action="activate" />`.
     - For `active`: "Suspend" button opening `<StatusChangeDialog action="suspend" />`.
   - Pagination: renders previous/next buttons updating `?page=${page + 1}`.
2. **Status Change Confirmation (`status-change-dialog.tsx`)**:
   - Opens modal warning: *"Are you sure you want to activate/suspend {organizer.full_name}? This action is audited."*
   - On confirm, calls `updateStatus({ id: organizer.id, status: 'active' | 'suspended' })` via `useUpdateOrganizerStatus()`.
   - On success: toast notification + query cache invalidates and updates table.
3. **Org Settings Form (`admin-settings-page.tsx` + `org-settings-form.tsx`)**:
   - Query: `useOrgSettings()`.
   - Prepopulate form with current settings (`org_name`, `default_timezone`, `default_capacity_ceiling`, `sender_domain`, `malware_sandbox_enabled`, `self_registration_gate_enabled`).
   - Use `useForm({ resolver: orgSettingsUpdateResolver })`.
   - Layout structured using [`SettingsSection`](../../src/components/eirmis/settings-section.tsx):
     - Section 1: General Organization Info (`org_name`, `sender_domain`).
     - Section 2: Event Defaults (`default_timezone`, `default_capacity_ceiling`).
     - Section 3: Security & Gates (`malware_sandbox_enabled`, `self_registration_gate_enabled` toggles).
   - Submit calls update mutation in `useOrgSettings()`.
4. **Zero-Knowledge Boundary Enforcement**:
   - Admin views organizer profiles only.
   - Do **NOT** import or render any event, attendee, or invitation queries in the admin portal.

---

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

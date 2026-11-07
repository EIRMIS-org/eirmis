# Task 07 — Organizer Portal (Core Flows)

| Field | Value |
|---|---|
| **Order** | After 04 + 05 (form screens also need 11) |
| **Owner** | Jian + Jebron (Jian after finishing task 06) |
| **Lane** | D (Portals) — parallel with 08, 09, 10 |
| **Branch** | `feat/m4-w1-organizer-portal` → PR to `feat/m4-frontend` |

---

## Scope

Build the organizer's core Week-1 screens: events list, create-event wizard, guest list, and the approval queue (attendees + headcount). This is the **largest portal** — it anchors the main checkpoint flow (event → invite → approve → QR).

## Visual contract

[`mockup-plan/organizer-portal/organizer-portal.html`](../../mockup-plan/organizer-portal/organizer-portal.html) — event workspace with tabs, 4-step create wizard, approval queue with audited capacity override.

## Week-1 page set (core only — the rest is Week 2)

| Page / view | Route | Key operations |
|---|---|---|
| Events list | `/organizer` | `useListEvents`, `useCreateEvent` |
| Create-event wizard (4 steps) | `/organizer/events/new` | `useCreateEvent` |
| Event workspace — Guests tab | `/organizer/events/:eventId?tab=guests` | `useListGuests`, `useListInvitations`, `useCreateInvitation` |
| Event workspace — Approvals tab | `?tab=approvals` | `useListAttendees`, `useDecideAttendee`, `useListHeadcountRequests`, `useDecideHeadcountRequest` |
| Event workspace — QR dispatch | `?tab=qr` | `useDispatchQrBundle` |

**Deferred to Week 2:** reminders tab, invitation design/gallery, check-in staff assignments, email/audit logs, waitlist promotion UI. (The hooks exist from task 05; only the screens wait.)

## Key interactions

- **Create wizard:** 4 steps (basics → schedule → capacity → review); Zod schema per step from task 11; draft persists in URL search params so refresh keeps position.
- **Approval queue:** approve/reject attendee with optional note; capacity-override path shows the audited-override confirmation (mirrors the mockup); headcount request approve/reject updates the invitation's `max_party_size`.
- **QR dispatch:** select approved invitations → `useDispatchQrBundle` → success toast with bundle summary.
- **Cross-portal visibility (checkpoint requirement):** organizer approval must flip the guest's invitation status in the guest portal (MSW shared store), and attendance counts must react to staff scans.

## Developer Import Map

```tsx
// 1. Session Context (from Task 03)
import { useSession } from '@/app/providers/session-context'

// 2. Data Hooks (from Task 05 - src/features/organizer/hooks/)
import { useListEvents } from '@/features/organizer/hooks/use-list-events'
import { useCreateEvent } from '@/features/organizer/hooks/use-create-event'
import { useUpdateEvent } from '@/features/organizer/hooks/use-update-event'
import { useListGuests } from '@/features/organizer/hooks/use-list-guests'
import { useListInvitations } from '@/features/organizer/hooks/use-list-invitations'
import { useCreateInvitation } from '@/features/organizer/hooks/use-create-invitation'
import { useListAttendees } from '@/features/organizer/hooks/use-list-attendees'
import { useDecideAttendee } from '@/features/organizer/hooks/use-decide-attendee'
import { useListHeadcountRequests } from '@/features/organizer/hooks/use-list-headcount-requests'
import { useDecideHeadcountRequest } from '@/features/organizer/hooks/use-decide-headcount-request'
import { useDispatchQrBundle } from '@/features/organizer/hooks/use-dispatch-qr-bundle'

// 3. Forms & Validation (from Task 11 - src/lib/forms/)
import {
  eventCreateSchema,
  eventCreateResolver,
  eventUpdateSchema,
  eventUpdateResolver,
  invitationCreateSchema,
  invitationCreateResolver,
  invitationOrganizerUpdateSchema,
  invitationOrganizerUpdateResolver,
  FormRow,
  applyContractError,
} from '@/lib/forms'

// 4. Pre-built Domain Components (src/components/eirmis/)
import { QuotaBar, AttendeeItem } from '@/components/eirmis/portal-cards'

// 5. UI Primitives (src/components/ui/)
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
```

## Target File Structure

```
src/
├── pages/
│   └── organizer/
│       ├── organizer-layout.tsx             (existing layout shell rendering AppChrome + Outlet)
│       ├── events-page.tsx                  ← NEW: Events list & entry point ("/organizer")
│       ├── create-event-page.tsx            ← NEW: 4-step wizard ("/organizer/events/new")
│       └── event-workspace-page.tsx         ← NEW: Tabs workspace ("/organizer/events/:eventId")
└── features/
    └── organizer/
        └── components/                      ← NEW: Feature components
            ├── events-table.tsx             (Events list table with status badges & actions)
            ├── wizard/                      (Create event wizard steps)
            │   ├── wizard-step-basics.tsx   (Title, slug, description)
            │   ├── wizard-step-schedule.tsx (Dates, timezone, RSVP deadline)
            │   ├── wizard-step-capacity.tsx (Capacity, max party size, registration mode)
            │   └── wizard-step-review.tsx   (Summary review & submit)
            ├── guests-tab.tsx               (Guest roster + invitations list + Add Invitation modal)
            ├── add-invitation-dialog.tsx    (Modal with invitationCreateResolver)
            ├── approvals-tab.tsx            (Attendee approval cards + Headcount increase queue)
            ├── capacity-override-dialog.tsx (Audited override warning modal when over capacity)
            └── qr-dispatch-tab.tsx          (Batch select approved invitations → dispatch QR bundle)
```

## Router Slot Handoff

In [`src/app/routing/router.tsx`](../../src/app/routing/router.tsx):
```tsx
// Replace PlaceholderPage elements under /organizer:
{
  path: 'organizer',
  element: <EventsPage />,
},
{
  path: 'organizer/events/new',
  element: <CreateEventPage />,
},
{
  path: 'organizer/events/:eventId',
  element: <EventWorkspacePage />,
}
```

---

## Detailed Step-by-Step Implementation Guide

1. **Events List Page (`events-page.tsx` + `events-table.tsx`)**:
   - Query: `useListEvents()`.
   - Four basic states: Loading skeleton table, Empty ("No events found. Create your first event"), Error with retry, and Success table.
   - Header action: "Create Event" button navigating to `/organizer/events/new`.
   - Table rows show: Title, Date, Status chip (`published`, `draft`), Capacity bar, and "Manage" button navigating to `/organizer/events/:eventId`.
2. **Create Event 4-Step Wizard (`create-event-page.tsx`)**:
   - Steps:
     - Step 1: Basics (`title`, `slug`, `description`).
     - Step 2: Schedule (`starts_at`, `ends_at`, `event_timezone`, `rsvp_deadline`).
     - Step 3: Capacity & Rules (`capacity`, `max_party_size`, `visibility_mode`).
     - Step 4: Review summary.
   - Use `useForm({ resolver: eventCreateResolver })`.
   - On submit, call `createEvent(values)` mutation from `useCreateEvent()`.
   - On success, navigate to `/organizer/events/${newEvent.id}` with success toast.
3. **Event Workspace Tabs (`event-workspace-page.tsx`)**:
   - Parse `eventId` from `useParams()`.
   - Read active tab from URL search params: `const [searchParams, setSearchParams] = useSearchParams(); const tab = searchParams.get('tab') || 'guests'`.
   - Tabs:
     - `guests` → renders `<GuestsTab eventId={eventId} />`.
     - `approvals` → renders `<ApprovalsTab eventId={eventId} />`.
     - `qr` → renders `<QrDispatchTab eventId={eventId} />`.
4. **Guests Tab (`guests-tab.tsx` + `add-invitation-dialog.tsx`)**:
   - Hooks: `useListGuests(eventId)` and `useListInvitations({ event_id: eventId })`.
   - "Add Invitation" dialog: form using `invitationCreateResolver`. Mutation: `useCreateInvitation()`.
5. **Approvals Tab (`approvals-tab.tsx`)**:
   - Attendees Queue: `useListAttendees({ invitation_id: ... })`.
     - Approve / Reject action with optional `review_reason` note via `useDecideAttendee()`.
     - If approval exceeds capacity, open `<CapacityOverrideDialog />`.
   - Headcount Queue: `useListHeadcountRequests({ event_id: ... })`.
     - Approve / Reject action via `useDecideHeadcountRequest()`.
6. **QR Dispatch Tab (`qr-dispatch-tab.tsx`)**:
   - Table of approved invitations.
   - Multi-select checkboxes + "Dispatch QR Bundles" button calling `useDispatchQrBundle()`.
   - Sonner toast showing dispatched count.

---

## Steps

1. Events list with the four basic states; "New event" opens the wizard.
2. Wizard steps 1–4 with per-step Zod validation; submit via `useCreateEvent`; navigate to the new event workspace.
3. Guests tab: guest table + invitation list; "Add invitation" form.
4. Approvals tab: attendee queue with approve/reject + note; headcount request queue.
5. QR tab: selection + dispatch flow.
6. Wire tab state to URL search params (deep-linkable tabs for the checkpoint).

## Files touched

- `src/pages/organizer/` — fill layout outlets
- `src/features/organizer/components/` — **new** (events table, wizard steps, guest table, approval queue, qr dispatch)
- `src/features/organizer/schemas/` — consumed from task 11 (create-event, invitation-create)

## Out of scope

- Reminders, design/gallery, staff assignments, logs, waitlist UI (Week 2)
- All-states exhaustive coverage + a11y (Week 2)

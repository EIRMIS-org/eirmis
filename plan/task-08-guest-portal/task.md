# Task 08 — Guest Portal (Core Flows)

| Field | Value |
|---|---|
| **Order** | After 04 + 05 (form screens also need 11) |
| **Owner** | Genesis + Martin (Genesis after finishing task 05) |
| **Lane** | D (Portals) — parallel with 07, 09, 10 |
| **Branch** | `feat/m4-w1-guest-portal` → PR to `feat/m4-frontend` |

---

## Scope

Build the guest's mobile-first core screens: my invitations, RSVP, roster submission with the `max_party_size` ceiling, rejected-attendee resubmit, headcount request, and the wallet-style QR pass. The guest portal is the **RSVP half of the main checkpoint flow**.

## Visual contract

[`mockup-plan/guest-portal/guest-portal.html`](../../mockup-plan/guest-portal/guest-portal.html) — mobile-first layout, RSVP selector, roster editor, wallet pass. Reuse [`rsvp-selector.tsx`](../../src/components/eirmis/rsvp-selector.tsx) and [`wallet-pass.tsx`](../../src/components/eirmis/wallet-pass.tsx).

## Week-1 page set

| Page / view | Route | Key operations |
|---|---|---|
| My invitations | `/guest` | `useMyInvitations` (listInvitations scoped to guest) |
| Invitation detail / RSVP | `/guest/invitations/:invitationId` | `useRsvp` (updateInvitation: status, dietary_preference, special_requests) |
| Roster editor | within invitation detail | `useListAttendees`, `useSubmitAttendee`, `useUpdateAttendee` |
| Headcount request | within invitation detail | `useSubmitHeadcountRequest` |
| QR wallet pass | within invitation detail (approved state) | displays QR from invitation data |

## Key interactions

- **RSVP:** accept/decline via [`rsvp-selector.tsx`](../../src/components/eirmis/rsvp-selector.tsx); dietary preference + special requests fields; 422 errors inline.
- **Roster with ceiling:** party members list enforces `max_party_size` — the "add member" action disables at the ceiling with an explanatory message and offers the headcount-request path (mirrors the mockup).
- **Rejected-attendee resubmit:** rejected members show a resubmit action pre-filled with prior data (`useUpdateAttendee`).
- **Headcount request:** reason + requested heads → `useSubmitHeadcountRequest` → pending state visible; organizer approval (task 07) raises the ceiling here.
- **QR pass:** once approved + QR issued, render the wallet-style pass via [`wallet-pass.tsx`](../../src/components/eirmis/wallet-pass.tsx).
- **Cross-portal visibility (checkpoint requirement):** guest RSVP/roster submission appears in the organizer's approvals tab; organizer approval flips status here; staff scan marks the pass as used.

## Developer Import Map

```tsx
// 1. Session Context (from Task 03)
import { useSession } from '@/app/providers/session-context'

// 2. Data Hooks (from Task 05 - src/features/guest/hooks/)
import { useMyInvitations } from '@/features/guest/hooks/use-my-invitations'
import { useRsvp } from '@/features/guest/hooks/use-rsvp'
import { useSubmitAttendee } from '@/features/guest/hooks/use-submit-attendee'
import { useUpdateAttendee } from '@/features/guest/hooks/use-update-attendee'
import { useSubmitHeadcountRequest } from '@/features/guest/hooks/use-submit-headcount-request'
import { useListAttendees } from '@/features/organizer/hooks/use-list-attendees'

// 3. Forms & Validation (from Task 11 - src/lib/forms/)
import {
  invitationRsvpUpdateSchema,
  invitationRsvpUpdateResolver,
  attendeeCreateSchema,
  attendeeCreateResolver,
  attendeeUpdateSchema,
  attendeeUpdateResolver,
  headcountRequestCreateSchema,
  headcountRequestCreateResolver,
  FormRow,
  applyContractError,
} from '@/lib/forms'

// 4. Pre-built Domain Components (src/components/eirmis/)
import { RsvpSelector } from '@/components/eirmis/rsvp-selector'
import { WalletPass } from '@/components/eirmis/wallet-pass'
import { AttendeeItem, QuotaBar } from '@/components/eirmis/portal-cards'

// 5. UI Primitives (src/components/ui/)
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
```

## Target File Structure

```
src/
├── pages/
│   └── guest/
│       ├── guest-layout.tsx                 (existing layout shell rendering AppChrome + Outlet)
│       ├── guest-invitations-page.tsx       ← NEW: Invitations list ("/guest")
│       └── invitation-detail-page.tsx       ← NEW: RSVP, Roster, Pass ("/guest/invitations/:invitationId")
└── features/
    └── guest/
        └── components/                      ← NEW: Feature components
            ├── invitation-card.tsx          (Card with event title, date, status chip, RSVP button)
            ├── rsvp-section.tsx             (RsvpSelector + dietary & special requests form)
            ├── roster-editor.tsx            (List of submitted attendees + "Add member" action with ceiling check)
            ├── add-attendee-modal.tsx       (Modal with attendeeCreateResolver)
            ├── resubmit-attendee-modal.tsx  (Pre-filled modal for rejected attendees via attendeeUpdateResolver)
            ├── headcount-request-modal.tsx  (Reason + requested heads via headcountRequestCreateResolver)
            └── wallet-pass-view.tsx         (Displays wallet pass with QR token for approved status)
```

## Router Slot Handoff

In [`src/app/routing/router.tsx`](../../src/app/routing/router.tsx):
```tsx
// Replace PlaceholderPage elements under /guest:
{
  path: 'guest',
  element: <GuestInvitationsPage />,
},
{
  path: 'guest/invitations/:invitationId',
  element: <InvitationDetailPage />,
}
```

---

## Detailed Step-by-Step Implementation Guide

1. **Mobile-First Container (`guest-invitations-page.tsx`)**:
   - Wrap views in a mobile-optimized container: `<div className="mx-auto max-w-lg p-4 space-y-6">`.
   - Query: `useMyInvitations()`.
   - States: Loading skeleton, Empty ("You have no invitations yet"), Error with retry, Success list of invitations.
   - Clicking an invitation navigates to `/guest/invitations/${invitation.id}`.
2. **RSVP Section (`rsvp-section.tsx`)**:
   - Render [`RsvpSelector`](../../src/components/eirmis/rsvp-selector.tsx) with statuses (`accepted`, `declined`).
   - Fields: `dietary_preference`, `special_requests`.
   - Form handled via `useForm({ resolver: invitationRsvpUpdateResolver })`.
   - Mutation: `useRsvp()`.
3. **Roster Editor & Ceiling Enforcement (`roster-editor.tsx`)**:
   - Query party members via `useListAttendees({ invitation_id: invitationId })`.
   - Enforce `max_party_size`:
     - If `attendees.length >= invitation.max_party_size`, disable the "Add Member" button and show a helpful banner: *"Party limit reached (max {max_party_size}). Need more spots?"* with a button to open `<HeadcountRequestModal />`.
   - Each row renders [`AttendeeItem`](../../src/components/eirmis/portal-cards.tsx):
     - If status is `rejected`, show a badge and a "Fix & Resubmit" button opening `<ResubmitAttendeeModal />`.
4. **Headcount Request Modal (`headcount-request-modal.tsx`)**:
   - Form: `requested_additional_heads` (number) and `note` (string).
   - Form handled via `headcountRequestCreateResolver`.
   - Mutation: `useSubmitHeadcountRequest()`.
   - After submission, show "Request Pending Approval" badge.
5. **QR Wallet Pass (`wallet-pass-view.tsx`)**:
   - If `invitation.status === 'accepted'` and attendees have approved QR tokens:
   - Render [`WalletPass`](../../src/components/eirmis/wallet-pass.tsx) displaying event title, date, guest name, and the generated QR token.

---

## Steps

1. My-invitations list with the four basic states (mobile-first container).
2. Invitation detail: RSVP block with the selector + fields.
3. Roster editor: member list, add-member with ceiling enforcement, resubmit flow for rejected members.
4. Headcount request form + pending/approved status display.
5. QR wallet pass for approved invitations.
6. Verify the cross-portal loop against task 07's screens (shared MSW store).

## Files touched

- `src/pages/guest/` — fill layout outlets
- `src/features/guest/components/` — **new** (invitation list, rsvp block, roster editor, headcount form, wallet view)
- `src/features/guest/schemas/` — consumed from task 11 (rsvp update, attendee create/update, headcount request)

## Out of scope

- Guest profile settings screen (Week 2)
- Exhaustive states + a11y (Week 2)

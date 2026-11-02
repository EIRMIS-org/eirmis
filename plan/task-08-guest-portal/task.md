# Task 08 — Guest Portal (Core Flows)

| Field | Value |
|---|---|
| **Order** | After 04 + 05 (form screens also need 11) |
| **Owner** | Dev 2 (after finishing task 05) |
| **Lane** | D (Portals) — parallel with 07, 09, 10 |
| **Branch** | `feat/m4-w1-guest-portal` |

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

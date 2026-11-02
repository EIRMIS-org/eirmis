# Task 07 — Organizer Portal (Core Flows)

| Field | Value |
|---|---|
| **Order** | After 04 + 05 (form screens also need 11) |
| **Owner** | Dev 1 (after finishing task 06) |
| **Lane** | D (Portals) — parallel with 08, 09, 10 |
| **Branch** | `feat/m4-w1-organizer-portal` |

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

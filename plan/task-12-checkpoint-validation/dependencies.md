# Task 12 — Dependencies

## Blocked by (ALL of)

| Task | What it contributes to the walkthrough |
|---|---|
| [06 Landing & Auth](../task-06-landing-auth/task.md) | Steps 1, 4, 9, 12 — sign-in and identity switching |
| [07 Organizer Portal](../task-07-organizer-portal/task.md) | Steps 2, 3, 7, 8 — create, invite, approve, dispatch |
| [08 Guest Portal](../task-08-guest-portal/task.md) | Steps 4–6, 8 — RSVP, roster, headcount, wallet pass |
| [09 Check-in Staff Portal](../task-09-checkin-staff-portal/task.md) | Steps 9–11 — scan, states, attendance count |
| [10 Admin Portal](../task-10-admin-portal/task.md) | Step 12 — verification + role isolation |

(01–05, 11 transitively.)

## Blocks

| Item | Why |
|---|---|
| Week 2 plan | Week 2 is scoped from this checkpoint's spillover list, not from assumptions |
| M4 CI job (unit + component tests) | Only wired once the checkpoint confirms the component inventory is stable |

## Parallel with

Nothing — this is the week's synchronization point. All Lane D work merges before the walkthrough.

## Contract operations consumed

All of the Week-1 subset across portals, exercised end-to-end through the UI:

`listEvents`, `createEvent`, `listInvitations`, `createInvitation`, `updateInvitation`, `listAttendees`, `submitAttendee`, `decideAttendee`, `listHeadcountRequests`, `submitHeadcountRequest`, `decideHeadcountRequest`, `dispatchQrBundle`, `getAssignedEvent`, `scanCheckIn`, `adminListOrganizers`, `adminUpdateOrganizerStatus`, `discoverPublicEvents`, `registerPublicGuest`

## Shared-file conflicts

None — validation only. Any fix required mid-walkthrough fails the gate and becomes a first-priority fix task.

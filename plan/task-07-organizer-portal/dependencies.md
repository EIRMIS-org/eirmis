# Task 07 — Dependencies

## Blocked by

| Task | Why |
|---|---|
| [04 Routing & Guards](../task-04-routing-guards/task.md) | `/organizer/**` route slots + layout shell + `organizer` guard |
| [05 Query Layer](../task-05-query-layer/task.md) | The full organizer hook set |
| [11 Forms & Schemas](../task-11-forms-schemas/task.md) | **Form screens wait for this:** create-event wizard, add-invitation form. List views can start without it. |

(01–03 transitively.)

## Blocks

| Task | Why |
|---|---|
| [12 Checkpoint](../task-12-checkpoint-validation/task.md) | The main flow's spine: event → invite → approve → QR all live here |

## Parallel with

| Task | Why it is safe |
|---|---|
| [08 Guest Portal](../task-08-guest-portal/task.md) | Disjoint folders. **Behavioral coupling, not code coupling:** organizer approvals must be visible in the guest portal via the MSW shared store — coordinate test data, not files. |
| [09 Check-in Staff Portal](../task-09-checkin-staff-portal/task.md) | Disjoint folders; staff scans must move organizer attendance counts (MSW store behavior) |
| [10 Admin Portal](../task-10-admin-portal/task.md) | Disjoint folders |

## Contract operations consumed (Week 1 subset)

`listEvents`, `createEvent`, `updateEvent`, `listGuests`, `listInvitations`, `createInvitation`, `listAttendees`, `decideAttendee`, `listHeadcountRequests`, `decideHeadcountRequest`, `dispatchQrBundle`

(Week 2 adds: reminder schedules, invitation design + gallery CRUD, check-in assignments, email/audit logs, `promoteWaitlist`, `uploadInvitationHtml`.)

## Shared-file conflicts

| File | Conflict risk | Mitigation |
|---|---|---|
| `router.tsx` | Low | Any new route (e.g. waitlist) goes through the task board to the 04 owner |
| `src/features/organizer/**` | None | Exclusive to this task |
| MSW shared-store semantics | **Coordination risk with 08/09** | Agree on the store's invitation/attendee status transitions on Wednesday morning before any of the three portals build against it |

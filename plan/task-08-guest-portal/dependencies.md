# Task 08 — Dependencies

## Blocked by

| Task | Why |
|---|---|
| [04 Routing & Guards](../task-04-routing-guards/task.md) | `/guest/**` route slots + `guest` guard |
| [05 Query Layer](../task-05-query-layer/task.md) | Guest hooks (this task's owner **wrote** task 05 — zero handoff risk) |
| [11 Forms & Schemas](../task-11-forms-schemas/task.md) | Roster + headcount forms wait for schemas; the RSVP block can start without it |

(01–03 transitively.)

## Blocks

| Task | Why |
|---|---|
| [12 Checkpoint](../task-12-checkpoint-validation/task.md) | The RSVP + roster + QR legs of the main flow |

## Parallel with

| Task | Why it is safe |
|---|---|
| [07 Organizer Portal](../task-07-organizer-portal/task.md) | Disjoint folders. **Behavioral coupling:** organizer approvals raise this portal's `max_party_size` and flip invitation status — coordinate MSW store semantics at kickoff (agreed in task 07's dependencies file). |
| [09 Check-in Staff Portal](../task-09-checkin-staff-portal/task.md) | Disjoint folders; staff scans must mark the guest's QR pass as used |
| [10 Admin Portal](../task-10-admin-portal/task.md) | Disjoint folders |

## Contract operations consumed

`listInvitations` (guest scope), `updateInvitation` (RSVP fields), `listAttendees`, `submitAttendee`, `updateAttendee`, `submitHeadcountRequest`, `updateGuestProfile` (Week 2)

## Shared-file conflicts

| File | Conflict risk | Mitigation |
|---|---|---|
| `src/features/guest/**` | None | Exclusive to this task |
| [`rsvp-selector.tsx`](../../src/components/eirmis/rsvp-selector.tsx), [`wallet-pass.tsx`](../../src/components/eirmis/wallet-pass.tsx) | Low | Only this task consumes them this week |
| MSW store semantics | Coordination risk with 07/09 | Same kickoff agreement as task 07 |

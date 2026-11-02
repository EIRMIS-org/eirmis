# Task 09 — Dependencies

## Blocked by

| Task | Why |
|---|---|
| [04 Routing & Guards](../task-04-routing-guards/task.md) | `/staff/**` route slots + `checkin` guard |
| [05 Query Layer](../task-05-query-layer/task.md) | `useScanCheckIn`, `useAssignedEvent` |

**Not blocked by task 11** — the walk-in form is a single flat form that can use inline RHF. This makes task 09 the **least-blocked portal**: it can start the moment 04 + 05 land (Tuesday afternoon) if Dev 3 finishes the task 11 handoff early.

(01–03 transitively.)

## Blocks

| Task | Why |
|---|---|
| [12 Checkpoint](../task-12-checkpoint-validation/task.md) | The check-in leg of the main flow — the flow is not demonstrable without it |

## Parallel with

| Task | Why it is safe |
|---|---|
| [07 Organizer Portal](../task-07-organizer-portal/task.md) | Disjoint folders. **Behavioral coupling:** scans increment the organizer's attendance count — covered by the Wednesday-morning MSW store agreement. |
| [08 Guest Portal](../task-08-guest-portal/task.md) | Disjoint folders; scans mark the guest's wallet pass as used |
| [10 Admin Portal](../task-10-admin-portal/task.md) | Disjoint folders |

## Contract operations consumed

`getAssignedEvent` (staff-scoped `listEvents`), `scanCheckIn`, `listAttendees` (staff scope), `submitAttendee` (walk-in)

## Shared-file conflicts

| File | Conflict risk | Mitigation |
|---|---|---|
| `src/features/checkin/**` | None | Exclusive to this task |
| [`scan-result.tsx`](../../src/components/eirmis/scan-result.tsx) | Low | Only this task consumes it |
| MSW store semantics | Coordination risk with 07/08 | Wednesday-morning agreement |

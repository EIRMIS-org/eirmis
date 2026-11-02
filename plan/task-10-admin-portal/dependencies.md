# Task 10 — Dependencies

## Blocked by

| Task | Why |
|---|---|
| [04 Routing & Guards](../task-04-routing-guards/task.md) | `/admin/**` route slots + `admin` guard |
| [05 Query Layer](../task-05-query-layer/task.md) | `useAdminOrganizers`, `useUpdateOrganizerStatus`, `useOrgSettings` |
| [11 Forms & Schemas](../task-11-forms-schemas/task.md) | **Settings form waits for the `OrgSettings` Zod schema.** The verification queue (list + status mutation) does NOT — it can start without task 11. |

(01–03 transitively.)

**Owner sequencing note:** Dev 4 builds task 11 first, then this task. The queue-first ordering inside this task means Dev 4 can start the queue while the settings schema lands.

## Blocks

| Task | Why |
|---|---|
| [12 Checkpoint](../task-12-checkpoint-validation/task.md) | Role-isolation demo + organizer activation leg |

## Parallel with

| Task | Why it is safe |
|---|---|
| [07 Organizer Portal](../task-07-organizer-portal/task.md) | Disjoint folders. **Behavioral coupling:** admin activation flips organizer status — MSW store agreement. |
| [08 Guest Portal](../task-08-guest-portal/task.md) | Disjoint folders |
| [09 Check-in Staff Portal](../task-09-checkin-staff-portal/task.md) | Disjoint folders |

## Contract operations consumed

`getAdminProfile`, `adminListOrganizers` (paginated), `adminUpdateOrganizerStatus`, `getOrgSettings`, `updateOrgSettings`

## Shared-file conflicts

| File | Conflict risk | Mitigation |
|---|---|---|
| `src/features/admin/**` | None | Exclusive to this task |
| [`settings-section.tsx`](../../src/components/eirmis/settings-section.tsx) | Low | Only this task consumes it |
| MSW store semantics | Coordination risk with 07 | Kickoff agreement before any portal builds against the store |

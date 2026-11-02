# Task 11 — Dependencies

## Blocked by

| Task | Why |
|---|---|
| [01 Dependencies Setup](../task-01-dependencies-setup/task.md) | Needs `zod`, `react-hook-form`, `@hookform/resolvers` |

**Not blocked by 02–05** — schemas are pure TypeScript over generated contract types. This is what makes Lane C parallel with Lanes A and B.

## Blocks

| Task | Which screens |
|---|---|
| [07 Organizer Portal](../task-07-organizer-portal/task.md) | Create-event wizard, add-invitation form |
| [08 Guest Portal](../task-08-guest-portal/task.md) | Roster editor, headcount request form |
| [10 Admin Portal](../task-10-admin-portal/task.md) | Org settings form |
| [06 Landing & Auth](../task-06-landing-auth/task.md) | *(soft)* public registration form — 06 may use inline RHF if 11 lands late |

## Parallel with

| Task | Why it is safe |
|---|---|
| [02 App Shell](../task-02-app-shell-providers/task.md) | `src/lib/forms/` vs `src/app/` — disjoint |
| [03 Session Context](../task-03-session-context/task.md) | No session dependency |
| [04 Routing & Guards](../task-04-routing-guards/task.md) | No routing dependency |
| [05 Query Layer](../task-05-query-layer/task.md) | Schemas vs hooks — both read contract types, neither writes shared files |

## Contract operations consumed (as schema sources)

`EventCreate`, `EventUpdate`, `InvitationCreate`, `InvitationRsvpUpdate`, `InvitationOrganizerUpdate`, `AttendeeCreate`, `AttendeeUpdate`, `HeadcountIncreaseRequestCreate`, `OrgSettings`, `RegisterPublicRequest` — all from [`contract/generated/schema.d.ts`](../../contract/generated/schema.d.ts) via the wrapper's re-exports.

## Shared-file conflicts

| File | Conflict risk | Mitigation |
|---|---|---|
| `src/lib/forms/**` | None | Exclusive to this task |
| Contract types | None | Read-only consumption; contract freeze holds |

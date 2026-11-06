# Task 03 — Dependencies

## Blocked by

| Task | Why |
|---|---|
| [02 App Shell](../task-02-app-shell-providers/task.md) | `SessionProvider` slots into the `AppProviders` composition |

## Blocks

| Task | Why |
|---|---|
| [04 Routing & Guards](../task-04-routing-guards/task.md) | Guards read `useSession().role` to allow/deny routes |
| [06 Landing & Auth](../task-06-landing-auth/task.md) | Sign-in buttons call `signIn(role)`; session pill renders `profile` |
| [07–10 Portals](../README.md) | Every portal page reads the session for identity display and role-scoped data |

## Parallel with

| Task | Why it is safe |
|---|---|
| [05 Query Layer](../task-05-query-layer/task.md) | Hooks call the API wrapper directly; the wrapper's `activeRole` module state works without React context. 05 does not import `useSession`. |
| [11 Forms & Schemas](../task-11-forms-schemas/task.md) | Pure schemas, no session dependency. |

## Contract operations consumed

None directly — but this task **activates** the role-scoping of all 45 operations by driving [`setRole()`](../../src/lib/api/index.ts), which MSW handlers use to decide 200 vs 401/403 responses.

## Shared-file conflicts

| File | Conflict risk | Mitigation |
|---|---|---|
| `src/app/providers/app-providers.tsx` | Medium — 02 and 03 both edit it | Lane A is sequential (02 → 03); same owner (lead) |

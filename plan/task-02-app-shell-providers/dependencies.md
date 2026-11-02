# Task 02 — Dependencies

## Blocked by

| Task | Why |
|---|---|
| [01 Dependencies Setup](../task-01-dependencies-setup/task.md) | Needs `@tanstack/react-query` installed |

## Blocks

| Task | Why |
|---|---|
| [03 Session Context](../task-03-session-context/task.md) | `SessionProvider` slots into the `AppProviders` composition created here |
| [04 Routing & Guards](../task-04-routing-guards/task.md) | `RouterProvider` slots into the same composition; guards render inside the provider stack |
| [06–10 Portals](../README.md) | Transitive — every page renders inside this stack |

## Parallel with

| Task | Why it is safe |
|---|---|
| [05 Query Layer](../task-05-query-layer/task.md) | 05 writes pure hook files under `src/lib/api/` + `src/features/*/hooks/`; it imports `QueryClient` types only at type level. The hooks are unit-testable without the provider tree. Merge order: 02 first, then 05 — no file overlap. |
| [11 Forms & Schemas](../task-11-forms-schemas/task.md) | Pure Zod schema files; zero overlap with `src/app/`. |

## Contract operations consumed

None directly — this task is contract-agnostic plumbing.

## Shared-file conflicts

| File | Conflict risk | Mitigation |
|---|---|---|
| [`src/App.tsx`](../../src/App.tsx) | High if 04 starts early | Lane A is sequential: 02 finishes its rewrite before 04 touches the file |
| [`src/main.tsx`](../../src/main.tsx) | Low | Only Lane A edits it this week |

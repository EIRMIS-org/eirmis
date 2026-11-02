# Task 01 — Dependencies

## Blocked by

Nothing. This is the **root task** of the week.

## Blocks

| Task | Why |
|---|---|
| [02 App Shell](../task-02-app-shell-providers/task.md) | Needs `@tanstack/react-query` + `react-router-dom` to create providers |
| [05 Query Layer](../task-05-query-layer/task.md) | Needs `@tanstack/react-query` for `useQuery`/`useMutation` |
| [11 Forms & Schemas](../task-11-forms-schemas/task.md) | Needs `react-hook-form`, `zod`, `@hookform/resolvers` |
| Everything downstream of 02, 05, 11 | Transitive |

## Parallel with

Nothing should start before this lands — but it is a ~30-minute task, so the cost of serialization is near zero. The moment it merges, **three lanes open simultaneously**:

- Lane A: 02 → 03 → 04 (lead)
- Lane B: 05 (dev 2)
- Lane C: 11 (dev 3)

## Contract operations consumed

None — this task touches no contract code.

## Shared-file conflicts

- `package.json` / `package-lock.json`: **this task is the only writer all week.** If anyone else needs a dependency during Week 1, they route it through the lead; no parallel installs.

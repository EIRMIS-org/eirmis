# Task 04 — Dependencies

## Blocked by

| Task | Why |
|---|---|
| [03 Session Context](../task-03-session-context/task.md) | `RoleGuard` reads `useSession()` |
| [02 App Shell](../task-02-app-shell-providers/task.md) | Router mounts inside the provider stack |
| [01 Dependencies](../task-01-dependencies-setup/task.md) | Needs `react-router-dom` |

## Blocks — **this is the Lane D gate**

| Task | Why |
|---|---|
| [06 Landing & Auth](../task-06-landing-auth/task.md) | Fills the `/` route slot |
| [07 Organizer Portal](../task-07-organizer-portal/task.md) | Fills `/organizer/**` outlets |
| [08 Guest Portal](../task-08-guest-portal/task.md) | Fills `/guest/**` outlets |
| [09 Check-in Staff Portal](../task-09-checkin-staff-portal/task.md) | Fills `/staff/**` outlets |
| [10 Admin Portal](../task-10-admin-portal/task.md) | Fills `/admin/**` outlets |
| [12 Checkpoint](../task-12-checkpoint-validation/task.md) | Transitive — deep-link checks need guards |

## Parallel with

| Task | Why it is safe |
|---|---|
| [05 Query Layer](../task-05-query-layer/task.md) | 05 writes hooks; 04 writes routing. Zero file overlap. Lane D starts when **both** land. |
| [11 Forms & Schemas](../task-11-forms-schemas/task.md) | Pure schemas; no overlap. |

## Contract operations consumed

None directly — guards are authorization *UI*, not API calls. (Contract-level 403 behavior is exercised later by portal pages.)

## Shared-file conflicts

| File | Conflict risk | Mitigation |
|---|---|---|
| [`src/App.tsx`](../../src/App.tsx) | High — 02 rewrote it, 04 rewrites again | Sequential Lane A, same owner |
| `src/pages/*/layout.tsx` | Medium — portal tasks add content | 04 creates the shells and **stops**; portals edit only their own folder afterward |
| `router.tsx` | High if portals self-serve routes | Rule: route changes go through the task board to the 04 owner |

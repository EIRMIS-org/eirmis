# Task 06 — Dependencies

## Blocked by

| Task | Why |
|---|---|
| [04 Routing & Guards](../task-04-routing-guards/task.md) | The `/` route slot and layout shell must exist |
| [05 Query Layer](../task-05-query-layer/task.md) | Needs `useDiscoverPublicEvents`, `usePublicGallery`, `useRegisterPublicGuest` |
| [03 Session Context](../task-03-session-context/task.md) | Sign-in buttons call `signIn()`; session pill reads the profile |

(01 → 02 transitively.)

## Blocks

| Task | Why |
|---|---|
| [12 Checkpoint](../task-12-checkpoint-validation/task.md) | The walkthrough starts here — every role signs in from this page |

## Parallel with

| Task | Why it is safe |
|---|---|
| [07–10 Portals](../README.md) | Disjoint feature folders (`src/features/landing/` vs portal folders). Only shared file is `global-nav.tsx` (session pill) — see conflicts below. |

**Lightest Lane D task** — no dependency on task 11 (forms), since the one form it has (public registration) can use inline RHF. Start it as soon as 04 + 05 land.

## Contract operations consumed

| Operation | Wrapper function | Hook |
|---|---|---|
| `listEvents` (public scope) | `discoverPublicEvents()` | `useDiscoverPublicEvents` |
| `listInvitationImages` (public) | `listPublicGalleryImages()` | `usePublicGallery` |
| `registerPublicGuest` | `registerPublicGuest()` | `useRegisterPublicGuest` |

## Shared-file conflicts

| File | Conflict risk | Mitigation |
|---|---|---|
| [`global-nav.tsx`](../../src/components/eirmis/global-nav.tsx) | **Medium-High** — task 06 adds the session pill; portal tasks may want nav tweaks | Task 06 owns the session-pill change and lands it **first**. Portal tasks treat the nav as read-only afterward; changes go through the task board. |
| `src/pages/landing/` | None | Exclusive to this task |

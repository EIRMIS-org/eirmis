# Task 05 — Dependencies

## Blocked by

| Task | Why |
|---|---|
| [01 Dependencies Setup](../task-01-dependencies-setup/task.md) | Needs `@tanstack/react-query` |

**Not blocked by 02–04** — hooks are pure TypeScript over the API wrapper. They can be written and type-checked without the provider tree, router, or session context. This is what makes Lane B parallel with Lane A.

## Blocks

| Task | Why |
|---|---|
| [06 Landing & Auth](../task-06-landing-auth/task.md) | Needs `useDiscoverPublicEvents`, `useRegisterPublicGuest` |
| [07 Organizer Portal](../task-07-organizer-portal/task.md) | Needs the full organizer hook set |
| [08 Guest Portal](../task-08-guest-portal/task.md) | Needs guest hooks |
| [09 Check-in Staff Portal](../task-09-checkin-staff-portal/task.md) | Needs `useScanCheckIn`, `useAssignedEvent` |
| [10 Admin Portal](../task-10-admin-portal/task.md) | Needs admin hooks |
| [12 Checkpoint](../task-12-checkpoint-validation/task.md) | Transitive |

## Parallel with

| Task | Why it is safe |
|---|---|
| [02 App Shell](../task-02-app-shell-providers/task.md) | No file overlap; hooks don't import providers |
| [03 Session Context](../task-03-session-context/task.md) | Hooks use the wrapper's module-level role, not React context |
| [04 Routing & Guards](../task-04-routing-guards/task.md) | Routing vs data — disjoint trees |
| [11 Forms & Schemas](../task-11-forms-schemas/task.md) | Schemas vs hooks — disjoint; both consume contract types read-only |

**Lane D start condition = 04 ✅ AND 05 ✅.** Portals start the moment both land.

## Contract operations consumed

All 45 `operationId`s via the wrapper functions in [`src/lib/api/index.ts`](../../src/lib/api/index.ts) — this task is the single consumer-mapping layer:

- Reads (`useQuery`): `listEvents`, `listGuests`, `listInvitations`, `listAttendees`, `listHeadcountRequests`, `listReminderSchedules`, `getInvitationDesign`, `listInvitationImages`, `listCheckInAssignments`, `listEmailLogs`, `listAuditLogEntries`, `getAdminProfile`, `adminListOrganizers`, `getOrgSettings`, `getAssignedEvent`, `discoverPublicEvents`, `listPublicGalleryImages`, `getOrganizerProfile`
- Writes (`useMutation`): `createEvent`, `updateEvent`, `createInvitation`, `updateInvitation`, `submitAttendee`, `updateAttendee`, `decideAttendee`, `decideHeadcountRequest`, `submitHeadcountRequest`, `upsertReminderSchedule`, `deleteReminderSchedule`, `createInvitationDesign`, `addInvitationImage`, `updateInvitationImage`, `deleteInvitationImage`, `createCheckInAssignment`, `updateCheckInAssignment`, `deleteCheckInAssignment`, `uploadInvitationHtml`, `dispatchQrBundle`, `promoteWaitlist`, `scanCheckIn`, `registerPublicGuest`, `updateGuestProfile`, `updateOrganizerStatus`, `updateOrganizerProfile`, `updateOrgSettings`

## Shared-file conflicts

| File | Conflict risk | Mitigation |
|---|---|---|
| `src/lib/api/query-keys.ts` | High if portal devs add keys ad hoc | **Only task 05 writes this file**; portal devs consume exported keys |
| `src/features/*/hooks/` | Low — portal devs read, don't write | If a hook is missing, request it on the task board |

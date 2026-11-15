# Task 05 — Query Layer (one hook per operationId)

| Field | Value |
|---|---|
| **Order** | Starts immediately after task 01 — runs parallel to Lane A |
| **Owner** | Genesis |
| **Lane** | B (Data) — 01 → 05, parallel with 02–04 |
| **Branch** | `feat/m4-w1-query-layer` |

---

## Scope

Create the query-key factory and one TanStack Query hook per contract `operationId`, wrapping the existing functions in [`src/lib/api/index.ts`](../../src/lib/api/index.ts). This is **mechanical work** — the wrapper already has one typed function per operation; each hook is a thin adapter.

## Design

### Query-key factory (single source of truth)

```ts
// src/lib/api/query-keys.ts
import type { operations } from '../../contract/generated/schema'

export const qk = {
  listEvents: (query?: operations['listEvents']['parameters']['query']) => ['listEvents', query] as const,
  listGuests: (eventId: string) => ['listGuests', eventId] as const,
  listInvitations: (scope: object) => ['listInvitations', scope] as const,
  listAttendees: (invitationId: string) => ['listAttendees', invitationId] as const,
  listHeadcountRequests: (eventId: string) => ['listHeadcountRequests', eventId] as const,
  listEmailLogs: (eventId: string) => ['listEmailLogs', eventId] as const,
  listAuditLogEntries: () => ['listAuditLogEntries'] as const,
  adminOrganizers: (page: number) => ['adminListOrganizers', page] as const,
  // ... one factory per read operation
}
```

**Rule:** keys are always `[operationId, ...params]`. This makes cache invalidation contract-traceable — a mutation hook can invalidate exactly the lists its operation affects.

### Hook file layout (by portal, so Lane D imports stay local)

```
src/features/
├── organizer/hooks/
│   ├── use-list-events.ts          useQuery(listEvents)
│   ├── use-create-event.ts         useMutation → invalidate listEvents
│   ├── use-update-event.ts         useMutation → invalidate listEvents + event detail
│   ├── use-list-guests.ts
│   ├── use-list-invitations.ts
│   ├── use-create-invitation.ts
│   ├── use-update-invitation.ts
│   ├── use-list-attendees.ts
│   ├── use-decide-attendee.ts      useMutation → invalidate listAttendees + listInvitations
│   ├── use-list-headcount-requests.ts
│   ├── use-decide-headcount-request.ts
│   ├── use-reminder-schedules.ts   (list + upsert + delete)
│   ├── use-invitation-design.ts    (design + gallery CRUD)
│   ├── use-checkin-assignments.ts  (list + create + revoke + delete)
│   ├── use-list-email-logs.ts
│   ├── use-list-audit-log-entries.ts
│   ├── use-dispatch-qr-bundle.ts
│   └── use-promote-waitlist.ts
├── guest/hooks/
│   ├── use-my-invitations.ts       listInvitations scoped to guest
│   ├── use-rsvp.ts                 updateInvitation (RSVP fields)
│   ├── use-submit-attendee.ts
│   ├── use-update-attendee.ts
│   ├── use-submit-headcount-request.ts
│   └── use-update-guest-profile.ts
├── checkin/hooks/
│   ├── use-assigned-event.ts       getAssignedEvent
│   └── use-scan-check-in.ts        scanCheckIn mutation
├── admin/hooks/
│   ├── use-admin-profile.ts
│   ├── use-admin-organizers.ts     paginated
│   ├── use-update-organizer-status.ts
│   └── use-org-settings.ts         get + update
└── landing/hooks/
    ├── use-discover-public-events.ts
    ├── use-public-gallery.ts
    └── use-register-public-guest.ts
```

### Mutation conventions

- Every mutation hook accepts an `onSuccess` chain that: (1) shows a sonner toast, (2) invalidates affected query keys via the factory, (3) surfaces contract error bodies (`Error` schema) as toast descriptions.
- Mutations **never** navigate — pages decide that (keeps hooks testable).

## Steps

1. Write `src/lib/api/query-keys.ts` (all read operations).
2. Write organizer hooks (largest set — start here).
3. Write guest, checkin, admin, landing hooks.
4. Smoke-test 3 representative hooks in the browser console against MSW: one query (`listEvents`), one mutation (`createEvent` + invalidation), one erroring mutation (`decideAttendee` with a bad id → 422 toast).
5. Hand off: post the final hook inventory on the task board so portal devs know exact export names.

## Files touched

- `src/lib/api/query-keys.ts` — **new** (only this task writes it)
- `src/features/*/hooks/*.ts` — **new** (~30 files)

## Out of scope

- No components, no pages, no forms — hooks only.
- No contract changes; if a wrapper function is missing or mis-typed, file it on the task board (contract freeze holds).

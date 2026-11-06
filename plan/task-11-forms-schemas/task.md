# Task 11 — Forms & Schemas Infrastructure (RHF + Zod)

| Field | Value |
|---|---|
| **Order** | Starts immediately after task 01 — runs parallel to Lanes A and B |
| **Owner** | Gian (start) → Cerna (handoff, then builds task 10) |
| **Lane** | C (Forms) — 01 → 11, parallel with Lanes A and B |
| **Branch** | `feat/m4-w1-forms-schemas` → PR to `feat/m4-frontend` |

---

## Scope

Create the Zod schemas that mirror the contract request types, plus the RHF adapter utilities every form-heavy screen consumes. This task **unblocks the form screens** of tasks 07, 08, and 10.

## Design principle

**Derive, don't re-declare.** The generated types in [`contract/generated/schema.d.ts`](../../contract/generated/schema.d.ts) are the source of truth. Zod schemas are written to match them, and a type-level test asserts the Zod output type equals the contract type — so a contract change breaks the build here first, not in a portal screen.

```ts
// src/lib/forms/schemas/event.ts
import { z } from 'zod'
import type { EventCreate } from '@/lib/api'

export const eventCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  starts_at: z.string().datetime({ offset: true }),
  capacity: z.coerce.number().int().positive(),
  max_party_size: z.coerce.number().int().positive(),
  registration_mode: z.enum(['open', 'invitation']),
  // ...fields exactly mirroring components['schemas']['EventCreate']
}) satisfies z.ZodType<EventCreate>
```

The `satisfies z.ZodType<ContractType>` pattern is the **drift guard** — it is the whole point of this task.

## Schema inventory (Week 1 form screens only)

| Schema file | Mirrors contract type | Consumed by |
|---|---|---|
| `event.ts` | `EventCreate`, `EventUpdate` | 07 wizard |
| `invitation.ts` | `InvitationCreate`, `InvitationRsvpUpdate`, `InvitationOrganizerUpdate` | 07 add-invitation, 08 RSVP |
| `attendee.ts` | `AttendeeCreate`, `AttendeeUpdate` | 08 roster, 09 walk-in |
| `headcount-request.ts` | `HeadcountIncreaseRequestCreate` | 08 headcount form |
| `org-settings.ts` | `OrgSettings` | 10 settings |
| `register-public.ts` | `RegisterPublicRequest` | 06 public registration (adopt if it lands before 06 builds the form) |

## RHF adapter utilities

```
src/lib/forms/
├── schemas/            ← the Zod schemas above
├── zod-resolver.ts     ← typed wrapper over @hookform/resolvers/zod
├── field-error.ts      ← maps ZodIssues + contract 422 Error bodies to field errors
└── form-row.tsx        ← shared label + input + error-message row (shadcn-based)
```

`field-error.ts` is the important one: contract 422 responses carry the `Error` schema body — it maps those onto RHF field errors so server-side validation shows inline, exactly like client-side Zod errors.

## Steps

1. Set up `src/lib/forms/` with the resolver wrapper and form-row component.
2. Write the six schema files with `satisfies z.ZodType<...>` drift guards.
3. Implement `field-error.ts` (Zod issues + contract 422 → RHF errors).
4. Type-check pass: intentionally break one schema field and confirm the build fails (prove the drift guard works), then revert.
5. Post the schema inventory + export names on the task board; hand off to Cerna for task 10 and notify Jian (07) and Genesis (08).

## Files touched

- `src/lib/forms/**` — **new** (all files exclusive to this task)
- No portal files — portals consume, never edit

## Out of scope

- Building any actual form UI (portal tasks own that)
- Schemas for Week 2 screens (reminder schedules, gallery, etc.)

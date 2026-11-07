# Task 11 — Acceptance Criteria

- [x] All six schema files exist under `src/lib/forms/schemas/` with `satisfies z.ZodType<ContractType>` drift guards
- [x] Drift guard proven: temporarily breaking a schema field fails `npm run typecheck` (verified, then reverted)
- [x] `zod-resolver.ts` provides a typed resolver wrapper used by all schemas
- [x] `field-error.ts` maps both Zod issues and contract 422 `Error` bodies onto RHF field errors
- [x] `form-row.tsx` renders label + input + error message using shadcn primitives
- [ ] Schema inventory + export names posted to the task board
- [x] No portal files touched
- [x] `npm run lint && npm run typecheck` all green

## Task-board handoff

Import the shared exports from `@/lib/forms`. Each stem below exports a
`Schema` and a `Resolver`, for example `eventCreateSchema` and `eventCreateResolver`.

| Consumer | Export stems |
|---|---|
| Organizer | `eventCreate`, `eventUpdate`, `invitationCreate`, `invitationOrganizerUpdate` |
| Guest and roster forms | `invitationRsvpUpdate`, `attendeeCreate`, `attendeeUpdate`, `headcountRequestCreate` |
| Admin settings | `orgSettings` (full record), `orgSettingsUpdate` (PATCH payload) |
| Public registration | `registerPublic` |

The same entry point exports `FormRow`, `createZodResolver`, `applyZodIssues`,
`applyContractError`, `mapZodIssues`, and `mapContractError`.

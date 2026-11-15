# Task 11 — Acceptance Criteria

- [ ] All six schema files exist under `src/lib/forms/schemas/` with `satisfies z.ZodType<ContractType>` drift guards
- [ ] Drift guard proven: temporarily breaking a schema field fails `npm run typecheck` (verified, then reverted)
- [ ] `zod-resolver.ts` provides a typed resolver wrapper used by all schemas
- [ ] `field-error.ts` maps both Zod issues and contract 422 `Error` bodies onto RHF field errors
- [ ] `form-row.tsx` renders label + input + error message using shadcn primitives
- [ ] Schema inventory + export names posted to the task board
- [ ] No portal files touched
- [ ] `npm run lint && npm run typecheck` all green

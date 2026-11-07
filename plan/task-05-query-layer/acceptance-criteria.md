# Task 05 — Acceptance Criteria

- [x] `src/lib/api/query-keys.ts` exports a factory for every read operation, keys shaped `[operationId, params]`
- [x] Every contract operation has a hook: 18 read hooks (`useQuery`) + ~27 write hooks (`useMutation`), organized under `src/features/{organizer,guest,checkin,admin,landing}/hooks/`
- [x] Every mutation invalidates the query keys its operation affects (spot-check: `useDecideAttendee` invalidates `listAttendees` + `listInvitations`)
- [x] Every mutation surfaces contract `Error` bodies as sonner toasts (verify a 422 path)
- [x] Smoke test passes in-browser against MSW: `useListEvents` returns data; `useCreateEvent` creates + refetches the list; a forced 422 shows the error toast
- [x] No hook imports router, session context, or component code
- [x] Hook inventory posted to the task board with exact export names
- [x] `npm run lint && npm run typecheck` all green

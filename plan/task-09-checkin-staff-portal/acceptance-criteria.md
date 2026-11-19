# Task 09 — Acceptance Criteria

- [x] Scan screen shows the assigned event (name, date, venue) from `useAssignedEvent`
- [x] All five scan-result states render correctly: success, already-checked-in, invalid-token, wrong-event, capacity-full
- [x] The state machine is a pure reducer in `scan-result-machine.ts` with no React imports
- [x] "Simulate scan" controls can trigger every documented outcome (checkpoint-demonstrable)
- [x] Manual search finds attendees by name/email and checks in from the result row
- [x] Walk-in registration creates an attendee and checks them in
- [x] Cross-portal: a successful scan increments the organizer's attendance count
- [x] `npm run lint && npm run typecheck && npm run build` all green

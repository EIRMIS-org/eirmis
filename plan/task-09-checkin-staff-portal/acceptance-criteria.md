# Task 09 — Acceptance Criteria

- [ ] Scan screen shows the assigned event (name, date, venue) from `useAssignedEvent`
- [ ] All five scan-result states render correctly: success, already-checked-in, invalid-token, wrong-event, capacity-full
- [ ] The state machine is a pure reducer in `scan-result-machine.ts` with no React imports
- [ ] "Simulate scan" controls can trigger every documented outcome (checkpoint-demonstrable)
- [ ] Manual search finds attendees by name/email and checks in from the result row
- [ ] Walk-in registration creates an attendee and checks them in
- [ ] Cross-portal: a successful scan increments the organizer's attendance count
- [ ] `npm run lint && npm run typecheck && npm run build` all green

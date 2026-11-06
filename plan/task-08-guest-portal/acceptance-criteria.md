# Task 08 — Acceptance Criteria

- [ ] My-invitations list renders mobile-first with loading/empty/error/success states
- [ ] RSVP accept/decline persists via MSW; dietary + special-requests fields validate with Zod; 422s show inline
- [ ] Roster editor enforces the `max_party_size` ceiling — add-member disables at the ceiling with an explanation and offers the headcount-request path
- [ ] Rejected attendees can be resubmitted with pre-filled data via `useUpdateAttendee`
- [ ] Headcount request submits, shows pending state, and the ceiling updates after organizer approval (cross-portal)
- [ ] Approved invitations with issued QR render the wallet-style pass
- [ ] Cross-portal: RSVP/roster submissions appear in the organizer approvals tab; staff scans mark the pass used
- [ ] `npm run lint && npm run typecheck && npm run build` all green

# Task 08 — Acceptance Criteria

- [x] My-invitations list renders mobile-first with loading/empty/error/success states
- [x] RSVP accept/decline persists via MSW; dietary + special-requests fields validate with Zod; 422s show inline
- [x] Roster editor enforces the `max_party_size` ceiling — add-member disables at the ceiling with an explanation and offers the headcount-request path
- [x] Rejected attendees can be resubmitted with pre-filled data via `useUpdateAttendee`
- [x] Headcount request submits, shows pending state, and the ceiling updates after organizer approval (cross-portal)
- [x] Approved invitations with issued QR render the wallet-style pass
- [x] Cross-portal: RSVP/roster submissions appear in the organizer approvals tab; staff scans mark the pass used
- [x] `npm run lint && npm run typecheck && npm run build` all green

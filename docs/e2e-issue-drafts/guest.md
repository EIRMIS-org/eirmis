# [M5 E2E][Guest] Register or open invitation, RSVP within party limits, request more heads, and view QR pass

Local issue draft — not published. Parent: [Task 03 / #86](https://github.com/EIRMIS-org/eirmis/issues/86). Implementation target: Milestone 5, Playwright. Suggested categorization: E2E, QA, Guest; select existing labels when publishing. Add to the EIRMIS board and record publication links in the [test specification](../mock-backend-test-spec.md).

## Role(s) Affected

- [x] Organizer (supporting approval actor)
- [ ] Admin
- [x] Guest
- [ ] Check-in Staff

## State / Authorization Rule

A guest can read/update only their own invitation, profile, RSVP, and attendee roster. Public discovery exposes only eligible published open-registration events, excluding invite-only, draft, closed where ineligible, and deleted events. Roster submission must respect max_party_size and the RSVP deadline. Approval precedes the issued QR pass flow.

## Preconditions and fixtures

- Seed Guest A and Guest B with separate invitations, an invite-only event, and a published open-registration event.
- Set max_party_size to a deterministic value (for example 2); define exactly which attendee statuses count toward it with the backend owner.
- Freeze time before deadline, then advance it for the negative test.
- Capture test magic links through a controlled mail adapter; do not rely on personal inboxes or production email. Use independent Organizer and Guest browser contexts.

## Test Case

| Step | Action | Expected result |
|---|---|---|
| 1a | Follow a valid invitation magic link | Auth session belongs to intended guest; only their invitation is shown; Auth behavior is live integration, outside Prism's HTTP contract |
| 1b | In a separate scenario, open public registration and submit details | Eligible event lookup 200; POST /functions/v1/register returns 201; intended registration/auth handoff occurs without exposing private events |
| 2 | Accept RSVP and submit roster up to max_party_size | Invitation PATCH 200/204; attendee POST 201; guest sees their saved roster after reload |
| 3 | Request additional headcount | POST /rest/v1/headcount_increase_requests returns 201 and request appears pending |
| 4 | Organizer approves request and attendee(s) in separate context | Decision functions return 200; allowance changes by agreed amount; approval state persists |
| 5 | Guest views issued QR pass | Pass belongs to approved attendee/event, renders after reload, and matches issued token; agree pass UI/data source during implementation |

## Validation / Error Behavior

- Exceed max_party_size and submit after deadline: Task 03 targets 422, no extra attendee/state change. Current operation responses do not establish those 422 cases (GAP-08); final status assertions stay blocked.
- Second pending headcount request: declared 409 and a useful error; no duplicate pending request.
- Invalid public registration: declared 400; duplicate registration: declared 409.
- Guest B must not read or edit Guest A's roster, profile, RSVP, or QR pass. PATCH attendee/profile declares 403; filtered GET denial may be an empty array.
- Expired magic link or session must not grant private access; use actual Auth/session behavior, not Prism fake tokens.
- No pass should expose another attendee's personal information or invent a QR token before the agreed issuance step.

## Coverage and unresolved gaps

- Covers POS-05/06/07, AUTH-01/02/03, VAL-02, CON-02, and REG-01.
- GAP-07: reconcile Guest read/RSVP role metadata and missing Guest listGuests smoke coverage.
- GAP-08: agree deadline/quota validation status and body before implementing final assertions.
- GAP-10: reconcile live PostgREST mutation URLs.
- Live Auth, quota, approval, QR issuance, and persistence are required; fixed mock examples only cover response handling.

## Acceptance Criteria

- [ ] Playwright covers both invitation magic-link and public registration entry paths.
- [ ] RSVP, bounded roster, headcount request/approval, and issued-pass journey persist across reloads.
- [ ] Over-limit and expired-deadline scenarios reject without unintended writes after contract agreement.
- [ ] Cross-guest access and expired-session scenarios reveal no private data.
- [ ] Pending-request and registration error feedback matches approved contract behavior.
- [ ] Blocked cases are reported separately from passes; CI captures sanitized traces and cleans fixtures.

## Administrative

- Owner / reviewer: unassigned; select during triage.
- Milestone: Milestone 5 Playwright E2E implementation; actual milestone selection pending publication.
- Dependencies: #83, Auth test harness, and agreed party/deadline/pass behavior.
- Issue URL / project board item: pending publication.

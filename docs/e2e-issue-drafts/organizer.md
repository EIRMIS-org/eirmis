# [M5 E2E][Organizer] Publish an event, approve attendees, dispatch QR passes, and review attendance

Local issue draft — not published. Parent: [Task 03 / #86](https://github.com/EIRMIS-org/eirmis/issues/86). Implementation target: Milestone 5, Playwright. Suggested categorization: E2E, QA, Organizer; select existing repository labels when publishing. Add to the EIRMIS project board and record the issue/board links in the [test specification](../mock-backend-test-spec.md).

## Role(s) Affected

- [x] Organizer
- [ ] Admin
- [x] Guest (supporting actor)
- [x] Check-in Staff (supporting actor)

## State / Authorization Rule

An active Organizer A manages event A only. Organizer B owns a separate event and attendee set. Guests submit their own RSVP/roster; only authorized decisions approve attendees and issue QR tokens. Staff must be assigned to the event before checking attendees in. Use independent browser contexts for these identities.

## Preconditions and fixtures

- Seed two organizers and isolated events, a Guest A invitation with max_party_size, a pending attendee, a pending headcount request, and Staff A assigned to event A.
- Freeze time before RSVP deadline. Use a controlled mail capture adapter and development Supabase, with deterministic cleanup.
- Use the Milestone 5 implemented UI routes and accessible labels; confirm them when implementing rather than hard-coding mockup routes now.

## Test Case

| Step | Action | Expected result |
|---|---|---|
| 1 | Organizer A creates a draft event and publishes it | POST /rest/v1/events returns 201; PATCH returns declared 200/204; reloading preserves published status |
| 2 | Invite Guest A | Invitation created with the correct event, guest, and party allowance; captured invitation leads to the intended guest flow |
| 3 | Guest A submits RSVP and attendee roster in a separate context | Organizer sees the accepted RSVP and pending attendee, scoped to event A |
| 4 | Organizer approves attendee and reviews headcount request | Decision functions return 200; review result persists, quota changes match approved request, and approved attendee gets an issued QR token |
| 5 | Dispatch QR bundle | POST /functions/v1/qr-bundle returns 200; captured delivery/download matches approved attendee and event; verify actual artifact rather than success toast alone |
| 6 | Assigned staff scans the issued token | Attendance records exactly one accepted check-in using the staff flow |
| 7 | Organizer opens live attendance and audit history | Attendance updates within the agreed timeout; refreshed page agrees; audit identifies actor, event, and relevant actions according to the implemented audit policy |

## Validation / Error Behavior

- Missing/expired session: protected operations return agreed 401 and UI requests sign-in.
- Organizer B cannot read or mutate event A, decisions, QR dispatch, or attendee details. Assert denial/no data/no writes using real RLS behavior; do not assume every filtered GET returns 403.
- Select a documented 403 decision response in mock mode and confirm useful UI feedback. This is separate from live cross-owner enforcement.
- Invalid HTML upload containing an external reference must be rejected without making a rejected design usable. HTTP 422 exists, but unified Error versus HtmlUploadResponse is unresolved (GAP-03/04).
- Failed decisions or dispatch must not show false completion. Do not infer real email delivery from Prism.

## Coverage and unresolved gaps

- Covers POS-01/02/03/09, AUTH-01/02/03, and VAL-01 in the parent specification.
- GAP-01/02: required test alias and stronger smoke/collection assertions remain pending.
- GAP-03/04: error body agreement pending for HTML rejection.
- GAP-10: confirm actual PostgREST filter routes before live requests are bound to tests.
- Email, QR generation, realtime, and audit effects require the live integration environment; fixed Prism examples cannot prove them.

## Acceptance Criteria

- [ ] Playwright covers the complete required organizer journey with independent supporting-role sessions.
- [ ] Assertions verify persisted state, captured QR delivery, attendance, and audit evidence.
- [ ] Cross-owner denial and failed-action feedback are covered without data leakage.
- [ ] Mock contract checks and live enforcement tests are clearly distinguished.
- [ ] Relevant gaps are resolved or tracked as explicit blocked cases; no blocked case is counted as passed.
- [ ] Test data is cleaned up; sanitized traces/results are available in CI.

## Administrative

- Owner / reviewer: unassigned; select during triage.
- Milestone: Milestone 5 Playwright E2E implementation; actual milestone selection pending publication.
- Related dependencies: #83; contract/backend features used by the journey.
- Issue URL / project board item: pending publication.

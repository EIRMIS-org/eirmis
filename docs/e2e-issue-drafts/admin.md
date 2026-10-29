# [M5 E2E][Admin] Paginate organizer verification, activate/suspend accounts, and update organization settings

Published as [#105](https://github.com/EIRMIS-org/eirmis/issues/105). Parent: [Task 03 / #86](https://github.com/EIRMIS-org/eirmis/issues/86). Verified on the [EIRMIS project board](https://github.com/orgs/EIRMIS-org/projects/1) in Backlog on October 30, 2026. Implementation target: Milestone 5 Playwright E2E; the repository currently has no M5 milestone, so the published issue retains its [M5 E2E] title marker. This local draft is retained as the source; see the [test specification](../mock-backend-test-spec.md) for the publication record.

## Role(s) Affected

- [ ] Organizer
- [x] Admin
- [ ] Guest
- [ ] Check-in Staff

## State / Authorization Rule

Only Admin may verify organizers and manage organization settings. Admin does not gain access to event guest lists, RSVPs, or attendee content. Non-admin identities cannot change organizer verification status or organization settings. Approval and suspension must affect organizer access according to the agreed lifecycle rules.

## Preconditions and fixtures

- Seed an admin, a non-admin identity, and at least 21 pending organizers with deterministic unique IDs and ordering.
- Include active organizers and unrelated event data to verify both queue filtering and privacy.
- Use a disposable Supabase environment. Define a reversible org_settings fixture only after that contract exists.
- Confirm implemented UI routes/labels, stable queue ordering, count behavior, and suspension semantics during implementation.

## Test Case

| Step | Action | Expected result / current blocker |
|---|---|---|
| 1 | Sign in as Admin and open pending verification | Own profile 200; pending organizer queue visible without unrelated private event data |
| 2 | Read first page at limit=20, offset=0, then second page at offset=20 | 20 distinct rows followed by remaining fixture rows, no duplicates or omissions; blocked by GAP-06 response maxItems=1 and missing explicit pagination parameters |
| 3 | Activate one pending organizer | PATCH /rest/v1/organizer_profiles/{id} returns declared 200/204; status persists and item leaves pending queue; activated organizer gains agreed access |
| 4 | Suspend an active organizer | Suspension persists and removes agreed access; blocked because OrganizerStatus currently contains only pending and active (GAP-06) |
| 5 | Update organization settings and reload | Agreed fields persist and remain admin-only; blocked because org_settings operations/schema are absent (GAP-06) |

## Validation / Error Behavior

- Missing/expired Admin session: 401 on protected operations; UI requests authentication.
- Non-admin status/settings changes: reject with agreed denial response and no mutation. PATCH organizer profile declares 403; settings response is pending contract design.
- Admin reads of guest/attendee resources must not reveal event-level data. Verify actual RLS empty-result/denial behavior rather than forcing 403 in the live test.
- Invalid status values must be rejected. Do not send suspended as a passing fixture before adding it to the approved enum.
- Failed settings updates must show an actionable error and preserve the previous value.

## Coverage and unresolved gaps

- Covers POS-04 and AUTH-01/02/03; queue, suspension, and settings are explicit blocked cases under GAP-06.
- GAP-07: Admin PATCH is described but missing from operation tags; reconcile role metadata.
- GAP-10: verify actual PostgREST mutation URL/filtering.
- Mock response selection does not prove account suspension, pagination, column restrictions, or settings persistence.

## Acceptance Criteria

- [ ] Queue pagination is validated with at least 21 pending organizers and agreed stable ordering.
- [ ] Activation and suspension persist and enforce the agreed organizer access rules.
- [ ] Settings update persists and is restricted to Admin.
- [ ] Admin cannot access unrelated guest/RSVP/attendee data.
- [ ] Non-admin writes and expired sessions are tested with no unauthorized state changes.
- [ ] GAP-06/07/10 are resolved before affected cases are counted as passing.
- [ ] CI provides sanitized evidence and deterministic fixture cleanup.

## Administrative

- Owner / reviewer: unassigned; select during triage.
- Milestone: Milestone 5 Playwright E2E implementation; M5 milestone is not yet available; target is recorded in the issue title and body.
- Dependencies: #83 and contract/backend resolution of settings, queue pagination, and suspension.
- Published issue: [#105](https://github.com/EIRMIS-org/eirmis/issues/105). Project: [EIRMIS](https://github.com/orgs/EIRMIS-org/projects/1), status Backlog.

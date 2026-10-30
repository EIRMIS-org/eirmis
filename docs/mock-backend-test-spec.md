# Mock backend test specification — Task 03

Parent: [#86](https://github.com/EIRMIS-org/eirmis/issues/86). Dependency: [Task 02 / #83](https://github.com/EIRMIS-org/eirmis/issues/83).

Status: draft for review. Baseline: `chore/open-api-contract-mockup-enhancement`, commit `726b9fe`, reviewed October 30, 2026. This document specifies contract checks now and role E2E implementation in Milestone 5. It does not certify live Supabase behavior or mark either issue complete.

## Scope and evidence

Sources of truth are [openapi.yaml](../contract/openapi.yaml), its referenced path/schema files, the [Prism test runner](../scripts/test-prism-endpoints.ts), and the [Postman collection](../postman/eirmis.postman_collection.json). See the [developer guide](mock-backend-guide.md) for installing dependencies and starting Prism.

The readiness review at this baseline observed:

- Contract lint passed.
- Prism on port 4010: 58 passed, 0 failed, 2 skipped, out of 60 registered test cases. The skips are the internal scan callback and scheduled reminder dispatcher.
- Postman contains 48 requests across Public, Organizer, Admin, Guest, and Check-in Staff. It contains no negative status assertions or named response example selectors.
- The smoke runner checks HTTP status only. Its role labels and fake Bearer tokens do not prove authorization; selected `Prefer: code=403` responses do not exercise RLS.
- The official freshness command failed on the Windows checkout path containing a space. An independent CLI generation matched committed types after line-ending normalization, but not byte for byte. That diagnostic is not an acceptance pass.

These are prior baseline observations, not results of executing this specification. Every case below remains specified unless separately recorded as executed with evidence.

## Fixtures and execution rules

Use isolated test accounts: Organizer A owns event A; Organizer B owns event B; Admin can verify organizers; Guest A has an invitation for event A and Guest B belongs to another invitation; Staff A has an active assignment to event A and Staff B is unassigned or revoked. Include invite-only and public published events, draft/closed/deleted events, pending/approved/rejected attendees, and a valid issued QR token. Freeze time before the RSVP deadline for positive tests, then advance beyond it for deadline tests. Use a separate development database and deterministic cleanup for live tests.

Prism uses the runner's fake role tokens and fixed example UUIDs. Live Supabase requires real role sessions and the project publishable/anon key. Do not use service-role credentials for user-role tests. Do not log tokens or real attendee information in evidence.

For every successful response, check the exact declared status, content type, schema-required fields, enum values, and nullability. Arrays, objects, and empty 204 bodies must match the selected response schema. Test each supported role separately on shared operations. For mutations with declared 200 and 204 responses, test `Prefer: return=representation` and the minimal/default response separately; the current smoke suite usually exercises only one variant.

For PostgREST lists, test supported filters, stable ordering, `limit=20&offset=0`, subsequent pages, and `Prefer: count=exact`/`Content-Range` where declared. Prism returns fixtures; row ownership, filtering, pagination accuracy, counts, persistence, and side effects require live verification.

## Complete operation and role matrix

Each row identifies one operation exposed by the root contract. O = Organizer; A = Admin; G = Guest; S = Check-in Staff; P = Public. A status in a role column is a positive response to exercise, not proof of permission. `—` means no positive scenario specified for that role; use AUTH-03 for denial checks on live Supabase and reconcile missing denial responses before claiming contract coverage. Internal operations are excluded from user-role smoke execution.

The failure column lists only responses currently declared by the contract. It does not imply every failure is already tested. Shared Guest reads/RSVP and Admin profile updates are included from operation descriptions and existing role requests even where tags are incomplete (GAP-07).

| Operation | Method and path | O | A | G | S | P | Declared failures | Scope |
|---|---|---|---|---|---|---|---|---|
| `listEvents` | `GET /rest/v1/events` | 200 | — | — | 200 | 200 | 401 | User/public contract |
| `createEvent` | `POST /rest/v1/events` | 201 | — | — | — | — | 401, 403, 409 | User/public contract |
| `updateEvent` | `PATCH /rest/v1/events/{id}` | 200/204 | — | — | — | — | 401, 403 | User/public contract |
| `listReminderSchedules` | `GET /rest/v1/reminder_schedules` | 200 | — | — | — | — | 401 | User/public contract |
| `upsertReminderSchedule` | `POST /rest/v1/reminder_schedules` | 201 | — | — | — | — | 401 | User/public contract |
| `deleteReminderSchedule` | `DELETE /rest/v1/reminder_schedules/{id}` | 204 | — | — | — | — | 401 | User/public contract |
| `listGuests` | `GET /rest/v1/guests` | 200 | — | 200 | — | — | 401 | User/public contract |
| `listInvitations` | `GET /rest/v1/invitations` | 200 | — | 200 | — | — | 401 | User/public contract |
| `createInvitation` | `POST /rest/v1/invitations` | 201 | — | — | — | — | 401, 409 | User/public contract |
| `updateInvitation` | `PATCH /rest/v1/invitations/{id}` | 200/204 | — | 200/204 | — | — | 401, 403 | User/public contract |
| `listAttendees` | `GET /rest/v1/attendees` | 200 | — | 200 | 200 | — | 401 | User/public contract |
| `submitAttendee` | `POST /rest/v1/attendees` | — | — | 201 | — | — | 401, 403 | User/public contract |
| `updateAttendee` | `PATCH /rest/v1/attendees/{id}` | — | — | 200/204 | — | — | 401, 403 | User/public contract |
| `listHeadcountRequests` | `GET /rest/v1/headcount_increase_requests` | 200 | — | 200 | — | — | 401 | User/public contract |
| `submitHeadcountRequest` | `POST /functions/v1/submit-headcount-request` | — | — | 201 | — | — | 401, 403, 409, 500, 502 | Edge Function |
| `getInvitationDesign` | `GET /rest/v1/invitation_designs` | 200 | — | — | — | — | 401 | User/public contract |
| `createInvitationDesign` | `POST /rest/v1/invitation_designs` | 201 | — | — | — | — | 401, 409 | User/public contract |
| `listInvitationImages` | `GET /rest/v1/invitation_images` | 200 | — | — | — | 200 | 401 | User/public contract |
| `addInvitationImage` | `POST /rest/v1/invitation_images` | 201 | — | — | — | — | 401 | User/public contract |
| `updateInvitationImage` | `PATCH /rest/v1/invitation_images/{id}` | 204 | — | — | — | — | 401 | User/public contract |
| `deleteInvitationImage` | `DELETE /rest/v1/invitation_images/{id}` | 204 | — | — | — | — | 401 | User/public contract |
| `listCheckInAssignments` | `GET /rest/v1/checkin_assignments` | 200 | — | — | — | — | 401 | User/public contract |
| `createCheckInAssignment` | `POST /rest/v1/checkin_assignments` | 201 | — | — | — | — | 401, 409 | User/public contract |
| `updateCheckInAssignment` | `PATCH /rest/v1/checkin_assignments/{id}` | 204 | — | — | — | — | 401 | User/public contract |
| `deleteCheckInAssignment` | `DELETE /rest/v1/checkin_assignments/{id}` | 204 | — | — | — | — | 401 | User/public contract |
| `listEmailLogs` | `GET /rest/v1/email_logs` | 200 | — | — | — | — | 401 | User/public contract |
| `listAuditLogEntries` | `GET /rest/v1/audit_log_entries` | 200 | — | — | — | — | 401 | User/public contract |
| `getOrganizerProfile` | `GET /rest/v1/organizer_profiles` | 200 | 200 | — | — | — | 401 | User/public contract |
| `updateOrganizerProfile` | `PATCH /rest/v1/organizer_profiles/{id}` | 200/204 | 200/204 | — | — | — | 401, 403 | User/public contract |
| `getAdminProfile` | `GET /rest/v1/admin_profiles` | — | 200 | — | — | — | 401 | User/public contract |
| `updateGuestProfile` | `PATCH /rest/v1/guests/{id}` | — | — | 200/204 | — | — | 401, 403 | User/public contract |
| `uploadInvitationHtml` | `POST /functions/v1/invitation-html` | 200 | — | — | — | — | 401, 403, 422 | User/public contract |
| `handleScanCallback` | `POST /functions/v1/html-scan-callback` | — | — | — | — | — | 400, 401 | Internal; service tests only |
| `decideAttendee` | `POST /functions/v1/attendees/{id}/decision` | 200 | — | — | — | — | 401, 403, 404 | User/public contract |
| `decideHeadcountRequest` | `POST /functions/v1/headcount-requests/{id}/decision` | 200 | — | — | — | — | 401, 403, 404 | User/public contract |
| `dispatchQrBundle` | `POST /functions/v1/qr-bundle` | 200 | — | — | — | — | 401, 403 | User/public contract |
| `scanCheckIn` | `POST /functions/v1/checkin/scan` | 200 | — | — | 200 | — | 401, 403 | User/public contract |
| `sendReminders` | `POST /functions/v1/reminders/dispatch` | — | — | — | — | — | 401 | Internal; service tests only |
| `promoteWaitlist` | `POST /functions/v1/waitlist/promote` | 200 | — | — | — | — | 401, 403 | User/public contract |
| `registerPublicGuest` | `POST /functions/v1/register` | — | — | — | — | 201 | 400, 409 | User/public contract |

### Response selection and headers

Use response example names from the response `content` map, not request example names:

| Operation | Response example | Expected status |
|---|---|---|
| `listEvents` | `OrganizerEventList`, `PublicEventDiscovery` | 200 |
| `createEvent` | `CreatedEvent` | 201 |
| `updateInvitation` | `AcceptedInvitation` | 200 |
| `submitAttendee` | `SubmittedAttendee` | 201 |
| `decideAttendee` | `Approved`, `ApprovedOverCapacity` | 200 |
| `scanCheckIn` | `Accepted`, `AlreadyCheckedIn` | 200 |

Example: `curl.exe -i http://127.0.0.1:4010/rest/v1/events -H "Authorization: Bearer fake-organizer-jwt" -H "Prefer: example=OrganizerEventList"`.

Combine selection and return preferences where required, for example `Prefer: example=AcceptedInvitation, return=representation`. Use `Prefer: code=403` to select a documented error response with an otherwise valid request. A forced response tests client handling, not the underlying denial condition. `Prefer: dynamic=true` is a separate synthetic-data variation, not a substitute for deterministic examples. Do not assert missing authentication on public registration, public gallery reads, or the optional-auth event read.

Path parameters in the current mock contract use `{id}` (often populated with `eq.<uuid>`); the Edge Function decision paths use the raw UUID. Confirm PostgREST mutation routing against the live backend before reusing mock URLs (GAP-10).

## Positive scenarios

| ID | Setup and action | Required assertions | Execution boundary |
|---|---|---|---|
| POS-01 | O creates draft event, then publishes it | POST 201; PATCH 200 with representation or 204 minimal; event identifiers and declared lifecycle fields | Shapes in Prism; persistence and visibility live |
| POS-02 | O creates invitation, reviews RSVP, approves an attendee and headcount request | Invitation POST 201; RSVP PATCH 200/204; decisions 200; declared decision fields | Shapes/examples in Prism; quota, approvals, and QR issuance live |
| POS-03 | O dispatches QR bundle, then reads attendees, email history, and audit log | Function 200; list reads 200; contract response schemas | Delivery, attendance updates, and audit effects live |
| POS-04 | A reads own profile and pending organizer queue, then activates organizer | GET 200; PATCH 200/204; no unrelated profile fields changed | Queue pagination blocked by GAP-06; enforcement live |
| POS-05 | P discovers a published open-registration event and registers | GET 200 with public filters; registration POST 201; no Authorization required | Anonymous visibility and registration side effects live |
| POS-06 | G accepts invitation, submits roster within quota, requests more heads | RSVP 200/204; attendee and request POST 201; identifiers match fixture ownership | Quota and deadline semantics live |
| POS-07 | G opens issued QR pass after approval | Own invitation/attendee reads 200 and declared QR fields | Pass rendering and ownership live; delivery/UI contract needs confirmation |
| POS-08 | S reads assigned event and scans a valid issued QR | Event GET 200; scan 200 with `result=accepted`; response fields follow schema | Signature, assignment, and single check-in mutation live |
| POS-09 | O manages reminders, design/gallery, staff assignments, profiles, and waitlist | Exercise each corresponding matrix row, including 201 creates and 204 deletes/updates | Mock shapes now; effects and authorization live |
| POS-10 | Internal service calls scan callback and reminder dispatcher | Declared schemas/statuses; user-role smoke cases remain skipped with reasons | Dedicated service integration tests, not frontend role tokens |

## Negative scenarios and error contracts

The desired unified error is `{ code, message, details, hint }`. The current `Error` schema requires only `code` and `message`; `details` and `hint` are optional nullable strings. Assert the currently declared schema and explicitly track the stronger Task 02/03 expectation under GAP-03. HTML upload 422 is a separate exception under GAP-04; do not mislabel it as a passing unified error test.

| ID | Input/action | Expected status and body | Prism versus live / current gap |
|---|---|---|---|
| AUTH-01 | Omit Authorization on a protected operation | 401; declared Error body | Repeat for every protected matrix operation declaring 401; public/optional-auth reads excluded |
| AUTH-02 | Expired/malformed JWT on a protected operation | Live 401; Error body | Prism verifies presence/scheme, not Supabase signature/expiry; fake tokens are not this test |
| AUTH-03 | Other organizer's resource, other guest's roster, admin access to event attendee data, unassigned/revoked staff scanner, public mutation | Deny access; 403 where declared, no unauthorized data or mutation | Force documented 403 in Prism; exercise real sessions live. RLS reads may return 200 with an empty array, so confirm expected per-operation behavior and record missing denial statuses |
| VAL-01 | Upload HTML containing external URLs, iframe, stylesheet import, or redirect | Issue target 422 unified Error; current contract 422 HtmlUploadResponse | Use valid multipart request plus `Prefer: code=422` for fixture selection; actual HTML scanning and safe rejection live; GAP-04 |
| VAL-02 | RSVP after deadline, roster exceeds max_party_size, invalid headcount request | Issue target 422 with agreed business validation error, no state change | Missing per-operation 422 declarations are GAP-08; do not silently expect 422 from current Prism |
| VAL-03 | Omit required request fields, use invalid enum/type, or malformed JSON | Rejected according to request validation and explicitly declared errors | Record actual Prism validation status/body; do not assume generic Prism validation errors equal the application Error model |
| CON-01 | Duplicate registration / invitation / unique design / assignment | 409 on matrix operations declaring it; Error body | Forced examples in Prism; real uniqueness and no duplicate rows live |
| CON-02 | Submit a second pending headcount request | 409; Error body | Prism response shape; pending-request constraint live |
| RES-01 | Decide a missing/inaccessible attendee or headcount request | 404 where declared; Error body | Forced response in Prism; visibility and non-disclosure live |
| REG-01 | Invalid public registration payload | 400; Error body | Current runner forces 400; also test actual invalid input separately |
| QR-01 | Repeat an accepted attendee scan | Issue target 409; current contract 200 with `already_checked_in` | Named Prism example exercises current UI handling; final HTTP expectation blocked by GAP-05; no extra attendance increment live |
| QR-02 | Malformed, expired, unknown, or tampered QR token | Issue target 422; current scan contract has no 422 and includes `invalid_token` in the 200 result enum | GAP-05; invalid-result schema also requires an attendee object, so agree a valid error payload before final assertions |

For every selected error, verify status, content type, declared body schema, meaningful message, and absence of sensitive information. Live cases additionally verify no unauthorized data, no unintended state change, and correct error feedback in the UI. Save fixture identity, operation, selected preference, expected/actual status, and sanitized body with the result.

## Local execution

Use a Node runtime satisfying the locked Prism package's `>=24.18.0` engine requirement. The earlier review ran on Node 24.13.0 with engine warnings, so a passing smoke result there is not supported-runtime certification.

```sh
npm ci
npm run contract:lint
npm run contract:mock
```

Keep Prism running in one terminal. In another:

```sh
npm run contract:test
```

This is the current implemented command. Task 02/03 explicitly require `npm run test:mock`, which is absent (GAP-01); do not report that command as passed. The intended resolution is to add the required alias to the same runner in Task 02.

Freshness acceptance command on POSIX shells:

```sh
SKIP_DRIFT=true npm run contract:check
```

PowerShell equivalent:

```powershell
$env:SKIP_DRIFT = 'true'
npm run contract:check
Remove-Item Env:SKIP_DRIFT
```

Run in a disposable shell, or restore a pre-existing SKIP_DRIFT value afterward. The baseline Windows failure is GAP-09. Do not regenerate committed declarations merely to hide a failure; fix the command and review any generated diff.

`SKIP_DRIFT=true` disables live database comparison. Without it, the script also skips the live check when either `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing. With both present, it compares documented PostgREST table/view path names against live paths. It does not compare columns, types, RLS, or Edge Function implementations. A skipped or table-name-only check must not be reported as zero live schema drift.

## Proposed GitHub Actions integration

The current workflow runs contract lint, freshness/check, and docs generation, but does not run the Prism smoke suite. The following is a proposed standalone job, not an applied workflow change or a verified CI run. The conditional keeps the current command explicit; resolve GAP-01 and then use `npm run test:mock` directly. GAP-09 must be fixed before freshness can be treated as reliable on all platforms.

```yaml
mock-contract:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '24.18.0'
        cache: npm
    - run: npm ci
    - run: npm run contract:lint
    - name: Run Prism smoke tests
      shell: bash
      run: |
        npm run contract:mock > prism.log 2>&1 &
        prism_pid=$!
        trap 'kill "$prism_pid" 2>/dev/null || true' EXIT
        node --input-type=module <<'JS'
        let ready = false;
        for (let attempt = 0; attempt < 60; attempt++) {
          try {
            const response = await fetch('http://127.0.0.1:4010/rest/v1/events?visibility_mode=eq.open_registration&status=eq.published');
            if (response.status === 200) { ready = true; break; }
          } catch {}
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (!ready) throw new Error('Prism not ready after 30 seconds');
        JS
        if node -e "process.exit(Object.hasOwn(require('./package.json').scripts, 'test:mock') ? 0 : 1)"; then
          npm run test:mock
        else
          echo 'test:mock missing: running contract:test; GAP-01 remains open'
          npm run contract:test
        fi
    - name: Check generated-type freshness only
      env:
        SKIP_DRIFT: 'true'
      run: npm run contract:check
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: prism-log
        path: prism.log
```

Run the live table-presence check separately with a disposable Supabase instance and matching migrations. Remove SKIP_DRIFT, provide both required environment variables, and require explicit evidence that the live branch ran. Add schema/column and authorization integration checks separately if needed; the existing script does not provide them. The current CI uses Node 20 while locked Prism requires >=24.18.0 (GAP-11).

## Unresolved gaps and disposition

These are local tracking IDs, not newly published GitHub issues. Suggested ownership is for coordination, not an assignment already made.

| ID | Gap | Resolution / suggested follow-up | Effect on Task 03 |
|---|---|---|---|
| GAP-01 | Required `test:mock` missing; `contract:test` exists | Task 02 owner adds required alias and records its passing execution | Required command acceptance pending |
| GAP-02 | Postman lacks negative assertions and named-example selection; runner only checks status | Task 02 owner adds 401/403/422 cases, example selectors, and response-body validation; compare collection and suite to complete matrix | Specification can proceed; coverage not certified |
| GAP-03 | Unified Error schema requires only code/message, while task describes four fields | Contract owner agrees optionality and updates examples/tests together | Stronger four-field assertion pending |
| GAP-04 | HTML 422 returns HtmlUploadResponse, requiring design, instead of unified Error | Contract/backend owners agree rejection payload, required fields, and representative negative example | HTML failure body expectation pending |
| GAP-05 | Scan duplicate/invalid targets 409/422 conflict with 200 result enum; invalid result still requires attendee | Contract/backend/QA agree statuses, nullable/absent attendee behavior, and examples | Staff issue keeps final status assertions blocked |
| GAP-06 | No org_settings operation; organizer list maxItems=1 conflicts with 20-row admin queue; OrganizerStatus only pending/active | Contract owner defines settings operations, paginated queue response/parameters, and suspension state | Admin settings, pagination, suspension cases blocked |
| GAP-07 | Shared-role metadata incomplete; Guest listGuests and Staff listAttendees are not exercised by current runner; Admin PATCH supported by description but omitted from tags | Task 02/contract owners reconcile tags, descriptions, Postman requests, and runner coverage | Matrix uses explicit intended roles, not tags alone |
| GAP-08 | Business-rule 422 scenarios (deadline/party size) lack matching operation responses | Contract/backend owners agree per-operation status and error model | Guest negative status assertions pending |
| GAP-09 | Freshness script uses shell:true with unquoted absolute path; hashes differ for LF/CRLF; installed generator treats --output - as a filename, not stdout | Tooling owner fixes path handling, stdout capture, and agreed newline policy; verify actual command on Windows and CI | Freshness acceptance remains open |
| GAP-10 | Mock PostgREST mutation paths use /table/{id}; real PostgREST filtering needs live verification | Backend/contract owners confirm table?id=eq.UUID routing before M3 rerun | Mock success is not live URL compatibility |
| GAP-11 | Current CI Node 20 is below locked Prism engine >=24.18.0; no Prism CI job | Tooling owner selects compatible runtime, wires smoke job, and captures results | Proposed CI steps remain unexecuted |

## Milestone 5 E2E issues and source drafts

Published October 30, 2026. All four issues were verified on the [EIRMIS project board](https://github.com/orgs/EIRMIS-org/projects/1) with status **Backlog**. Each references #86 and retains its unresolved gaps. Only M1 and M2 milestones are currently available; Milestone 5 is identified by the **[M5 E2E]** title marker and implementation target in each issue body, with formal milestone assignment pending its creation. Local source drafts are retained below.

| Role | Draft | Parent / implementation target | Publication evidence |
|---|---|---|---|
| Organizer | [Event lifecycle and attendance](e2e-issue-drafts/organizer.md) | #86 / Milestone 5 Playwright | [#104](https://github.com/EIRMIS-org/eirmis/issues/104) — [EIRMIS / Backlog](https://github.com/orgs/EIRMIS-org/projects/1) |
| Admin | [Verification and settings](e2e-issue-drafts/admin.md) | #86 / Milestone 5 Playwright | [#105](https://github.com/EIRMIS-org/eirmis/issues/105) — [EIRMIS / Backlog](https://github.com/orgs/EIRMIS-org/projects/1) |
| Guest | [Registration, RSVP, roster, and pass](e2e-issue-drafts/guest.md) | #86 / Milestone 5 Playwright | [#106](https://github.com/EIRMIS-org/eirmis/issues/106) — [EIRMIS / Backlog](https://github.com/orgs/EIRMIS-org/projects/1) |
| Check-in Staff | [Assigned scanner and QR rejection](e2e-issue-drafts/check-in-staff.md) | #86 / Milestone 5 Playwright | [#107](https://github.com/EIRMIS-org/eirmis/issues/107) — [EIRMIS / Backlog](https://github.com/orgs/EIRMIS-org/projects/1) |

## Completion checklist

- [x] Full operation inventory and role/status matrix documented against baseline.
- [x] Positive/negative scenarios, execution boundaries, and unresolved gaps specified.
- [x] CI steps and distinction between freshness and live drift documented.
- [x] Four role E2E issues drafted locally for Milestone 5.
- [ ] Resolve required command/body/contract gaps, or obtain an explicit agreed change to affected acceptance criteria.
- [ ] Execute required `npm run test:mock` and record results.
- [ ] Execute `SKIP_DRIFT=true npm run contract:check` successfully and record environment/output; do not claim live drift coverage from this command.
- [x] Publish at least one issue per role, identify the Milestone 5 implementation target, verify all four on the EIRMIS board in Backlog, and record issue links.
- [ ] Assign the formal M5 milestone when it becomes available.
- [ ] Review and merge the specification; close #86 only after its agreed acceptance criteria are satisfied.

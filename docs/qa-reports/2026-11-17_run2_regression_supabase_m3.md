# QA Test Run Report: EIRMIS API - Local Supabase M3 Backend Regression Run

- **Date & Time:** 2026-11-17 2:43:33 PM (Local Time)
- **QA Engineer:** Angel Nocerale
- **Git Commit / Branch:** 4e1df11 / feat/backend-core-functionality
- **Target Environment:** 
  - [ ] Stoplight Prism Mock (`http://127.0.0.1:4010`)
  - [x] Local Supabase Dev (`http://127.0.0.1:54321`)
  - [ ] Staging / Hosted Supabase
- **Postman Collection Version:** v0.1.0 (`EIRMIS API`)
- **Execution Mode:** Postman Collection Runner & Manual Request Verification

---

### Executive Summary

| Total Endpoints | Passed | Failed | Blocked | Pass Rate | Duration |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 48 | 38 | 10 | 0 | 79.17% | 16.79s |

- **Overall Status:** [ ] PASS  [ ] CONDITIONAL PASS  [x] FAIL
- **Blockers / High Severity Issues:** 
QA-01 (Critical): On a clean supabase db reset, no seeded user can log in (POST /auth/v1/token returns 500 Database error querying schema). This blocks all authenticated role testing unless a workaround(for testing only) is applied.
QA-02 (Medium): POST /functions/v1/register returns 404. The implemented function is register-public.
---

### Results by Role / Module

| Module / Role | Endpoints Tested | Pass | Fail | Notes / Discrepancies |
|---|:---:|:---:|:---:|---|
| **Public** | 3 | 2 | 1 | **Failed:** POST(Register for open registration event) request returned 409 message:event is not currently accepting public registrations|
| **Organizer - Events** | 4 | 3 | 1 |**Failed:**  POST(Create Event) returned a 403. code:42501, message: now row violates row-level security policy for table\"events\""
  |
| **Organizer - Reminders** | 3 | 3 | 0 | All requests passed |
| **Organizer - Guests/Invites**| 4 | 4 | 0 | All requests passed |
| **Organizer - Approvals** | 4 | 2 | 2 |**Failed:** POST(Decide Headcount Increase) returned a 404, code: not found, message: headcount request not found . POST(Decide Attendee returned a 404, code: attendee not found) |
| **Organizer - Design/Gallery**| 7 | 6 | 1 | **Failed:** POST(Upload HTML Invitation File) returned a 400, code: upload_400, message: provide one text/html file |
| **Organizer - Staff** | 4 | 3 | 1 |**Failed:**  POST(Assign Checkin Staff) returned a 400, code:23502, message null value in column \"invited_by\" of relation \"checkin_assignments\" violates not-null constraint|
| **Organizer - QR/Waitlist** | 2 | 1 | 1 | **Failed:** POST(Dispatch QR Code PDF Bundle) returned a 404, code: not found, message:invitation not found  |
| **Organizer - Logs/Profile** | 4 | 4 | 0 | All requests passed |
| **Admin** | 3 | 3 | 0 | All requests passed |
| **Guest** | 8 | 6 | 2 | **Failed:** POST(Submit Additional Atteendee) returned a 403, code: 42501. message new row violates row-level security policy for table \"attendees\""
POST(Submit Headcount Request) returned a 403, *code: forbidden, message: the invitation is not eligible for a headcount request*
|
| **Check-in Staff** | 2 | 1 | 1 |  **Failed:** POST(Scan QR Token and Record Check in) returned a 404, code: INVALID_QR_TOKEN, message: unsupported QR token|


---

### Defects Logged During Run

| Defect ID | Severity | Endpoint | Summary |
|---|:---:|---|---|
| QA-01 | Medium | `POST /rest/v1/events` | Returns `403` (`42501`) "new row violates row-level security policy" for `organizer@example.com`, whose status is `active`. Still `403` when the request is sent alone. <<VERIFY: root cause not yet confirmed>>  |
| QA-02 | Medium | `POST /rest/v1/checkin_assignments` | Returns `400` (`23502`): `invited_by` is NOT NULL in the database, but the request in the collection does not supply it. Contract/collection and schema disagree. |

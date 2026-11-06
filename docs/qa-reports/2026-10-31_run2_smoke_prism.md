# QA Test Run Report: EIRMIS API - Local Prism Mock Smoke Run

- **Date & Time:** 2026-10-31 01:59:53 PM (Local Time)
- **QA Engineer:** Jess Cormanes
- **Git Commit / Branch:** chore/open-api-contract-mockup-enhancement
- **Target Environment:** 
  - [x] Stoplight Prism Mock (`http://127.0.0.1:4010`)
  - [ ] Local Supabase Dev (`http://127.0.0.1:54321`)
  - [ ] Staging / Hosted Supabase
- **Postman Collection Version:** v0.1.0 (`EIRMIS API`)
- **Execution Mode:** Postman Collection Runner & Manual Request Verification

---

### Executive Summary

Postman Collection Runner:
| Total Endpoints | Passed | Failed | Blocked | Pass Rate | Duration |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 47 | 47 | 0 | 0 | 100% | 3.5s |

Manual Request Verification:

| Total Endpoints | Passed | Failed | Blocked | Pass Rate | Duration |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | 1 | 0 | 0 | 100% | 16ms |

- **Overall Status:** [x] PASS  [ ] CONDITIONAL PASS  [ ] FAIL
- **Blockers / High Severity Issues:** None. All automated assertions passed against the Prism mock server.

---

### Results by Role / Module

Postman Collection Runner:
| Module / Role | Endpoints Tested | Pass | Fail | Notes / Discrepancies |
|---|:---:|:---:|:---:|---|
| **Public** | 3 | 3 | 0 | Open registration & discovery verified |
| **Organizer - Events** | 4 | 4 | 0 | CRUD operations functional |
| **Organizer - Reminders** | 3 | 3 | 0 | Cron schedules saved |
| **Organizer - Guests/Invites**| 4 | 4 | 0 | Max party size constraints verified |
| **Organizer - Approvals** | 4 | 4 | 0 | Attendee decision & HIR passes |
| **Organizer - Design/Gallery**| 6 | 6 | 0 | *(Note: HTML file upload excluded from automated run)* |
| **Organizer - Staff** | 4 | 4 | 0 | Helper assignment scoped |
| **Organizer - QR/Waitlist** | 2 | 2 | 0 | QR bundle schema fix verified |
| **Organizer - Logs/Profile** | 4 | 4 | 0 | Audit and email logs verified |
| **Admin** | 3 | 3 | 0 | Verification queue operations pass |
| **Guest** | 8 | 8 | 0 | RSVP & +1 request submissions pass |
| **Check-in Staff** | 2 | 2 | 0 | QR check-in token redeem passes |


Manual Request Verification:
| Module / Role | Endpoints Tested | Pass | Fail | Notes / Discrepancies |
|---|:---:|:---:|:---:|---|
| **Organizer - Design/Gallery**| 1 | 1 | 0 | *Html file upload*
---

### Defects Logged During Run

*No defects were logged during this run. All tests passed.*

---

### Test Evidence Attached
- [x] **Postman Run JSON:** `2026-10-31_run2_smoke_prism.postman_test_run.json` (Summary confirms 47 Passed, 0 Failed).
- [x] **Postman UI Screenshots:** See visual evidence embedded below.

#### Visual Evidence

**1. Run Summary & Initial Endpoints**
*Shows the overall summary (47 total, 47 passed, 0 failed) and initial Public/Event endpoints passing.*
![Run Summary Screenshot](images/2026-10-31(2)/screenshot-1-summary.png)

**2. Reminders, Guests & Invitations**
*Shows successful execution of reminder schedules, guest lists, and invitation creation.*
![Reminders and Guests](images/2026-10-31(2)/screenshot-2-reminders.png)

**3. Gallery & Check-in Staff**
*Shows Gallery image updates, and successful execution of Check-in Staff assignments.*
![Gallery and Staff](images/2026-10-31(2)/screenshot-3-gallery.png)

**4. QR Bundle & Waitlist**
*Shows the `Dispatch QR Code PDF Bundle` endpoint now returning `200 OK` (previously failed with 422), and successful waitlist promotion.*
![QR Bundle and Waitlist](images/2026-10-31(2)/screenshot-4-qr-bundle.png)

**5. Admin & Logs**
*Shows successful execution of audit logs, profile reading, and Admin organizer verification.*
![Admin and Logs](images/2026-10-31(2)/screenshot-5-admin.png)

**6. Guest & Check-in Scanning**
*Shows successful execution of guest RSVPs, headcount increases, and final QR check-in scanning.*
![Guest and Check-in](images/2026-10-31(2)/screenshot-6-guest.png)

**7. Manual Verification: Upload HTML Invitation File**
*Since the Collection Runner cannot dynamically attach local files, this endpoint was verified manually. The screenshot shows a successful `200 OK` response after a file was manually attached.*
![Manual HTML Upload Success](images/2026-10-31(2)/screenshot-7-html-success.png)
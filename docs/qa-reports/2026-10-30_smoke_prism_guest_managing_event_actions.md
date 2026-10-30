**QA Test Run Report: EIRMIS API - Guest RSVP & Headcount Validation**

- **Date & Time:** 2026-10-30 (As per system time)
- **QA Engineer:** Jo Mari Jess Y. Cormanes
- **Git Commit / Branch:** feat/guest-managing-event-actions
- **Target Environment:**
  - ☑ Stoplight Prism Mock (<http://127.0.0.1:4010>)
  - □ Local Supabase Dev (<http://127.0.0.1:54321>)
- **Postman Collection Version:** v0.1.0 (postman/eirmis.postman_collection.json)
- **Execution Mode:** Manual Single Requests

**Executive Summary**

| **Total Endpoints** | **Passed** | **Failed** | **Blocked** | **Pass Rate** | **Duration** |
| ------------------- | ---------- | ---------- | ----------- | ------------- | ------------ |
| 4                   | 4          | 0          | 0           | 100%          | 0.2s         |

- **Overall Status:** \[x\] PASS \[ \] CONDITIONAL PASS \[ \] FAIL
- **Blockers / High Severity Issues:** None

**Results by Role / Module**

| **Module / Role**       | **Endpoints Tested** | **Pass** | **Fail** | **Notes / Discrepancies**                                           |
| ----------------------- | -------------------- | -------- | -------- | ------------------------------------------------------------------- |
| **Guest - Invitations** | 2                    | 2        | 0        | GET query with events(\*) embedding and PATCH RSVP updates verified |
| **Guest - Roster**      | 1                    | 1        | 0        | POST attendee submission verified                                   |
| **Guest - Headcount**   | 1                    | 1        | 0        | POST headcount increase request schema verified                     |

**Test Evidence Details**

**1\. GET /rest/v1/invitations (Guest Fetch)**

- **Status:** 200 OK
- **Validation:** Confirmed the guest_id filter and select=\*,events(\*) returned a successful array containing the joined event object.
- **Attachment:**

![](images/01-get-invitations.png)

**2\. PATCH /rest/v1/invitations/{id} (Guest RSVP Update)**

- **Status:** 200 OK
- **Validation:** Sent payload {"status": "accepted", "dietary_preference": "Vegan", "special_requests": "Wheelchair access"}. Verified Prism accepts the schema. _(Note: Prism returns default mock data rather than persisting the update, which is expected behavior)._
- **Attachment:** ![](images/02-patch-rsvp.png)

**3\. POST /rest/v1/attendees (Submit Attendee)**

- **Status:** 201 Created
- **Validation:** Sent payload with invitation_id, full_name, and email. Prism accepted the schema and returned a mock 201 Created response.
- **Attachment:** ![](images/03-post-attendee.png)

**4\. POST /rest/v1/headcount_increase_requests (Request Additional Heads)**

- **Status:** 201 Created
- **Validation:** Sent payload with requested_additional_heads: 2 and note. Prism validated the schema successfully (status 201).
- **Attachment:** ![](images/04-post-headcount.png)

**Defects Logged During Run**

_No defects logged during this test execution. (Note: The payload property mismatch bugs found in guest-portal.html were fixed in this iteration and validated in Postman)._
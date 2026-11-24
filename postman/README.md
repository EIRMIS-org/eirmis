# EIRMIS Postman Collection

This directory contains the official Postman collection and environment files for the **Event Invitation and RSVP Management Information System (EIRMIS)** API, structured strictly according to EIRMIS roles and the OpenAPI 3.1 contract in [`contract/openapi.yaml`](../contract/openapi.yaml).

---

## 📁 Directory Structure

```text
postman/
├── eirmis.postman_collection.json          # Main Postman Collection v2.1.0
├── eirmis.local-mock.postman_environment.json   # Environment targeting local Prism mock server (port 4010)
├── eirmis.supabase-local.postman_environment.json # Environment targeting local Supabase instance (port 54321)
└── README.md
```

---

## 👥 Organization by EIRMIS Role

The collection is organized into top-level folders reflecting the 5 EIRMIS roles:

| Folder | Authentication | Description & Endpoints |
|---|---|---|
| **Public** | *None (`noauth`)* | Unauthenticated open-registration event discovery (`GET /rest/v1/events`), gallery browsing (`GET /rest/v1/invitation_images`), and open guest registration (`POST /functions/v1/register`). |
| **Organizer** | `Bearer {{organizerToken}}` | Full organizer operations grouped into subfolders: <br>• **Events**: List, Create, Read, Update<br>• **Reminder Schedules**: List, Create/Upsert, Delete<br>• **Guests & Invitations**: List guests, issue invitations, adjust max party size<br>• **Approvals**: Review submitted attendees, approve/reject attendees (`POST /functions/v1/attendees/:id/decision`), approve/reject headcount requests (`POST /functions/v1/headcount-requests/:id/decision`)<br>• **Invitation Design & Gallery**: Design settings, HTML upload (`POST /functions/v1/invitation-html`), image gallery management<br>• **Check-in Staff Assignments**: Assign staff by email, revoke access<br>• **QR Codes & Waitlist**: Dispatch QR code PDF bundles (`POST /functions/v1/qr-bundle`), promote waitlisted guests (`POST /functions/v1/waitlist/promote`)<br>• **Logs & Profile**: Transactional email logs, audit logs, and organizer profile management |
| **Admin** | `Bearer {{adminToken}}` | System administrator operations: Read admin profile (`GET /rest/v1/admin_profiles`), view pending organizer accounts in verification queue (`GET /rest/v1/organizer_profiles?status=eq.pending`), and activate accounts (`PATCH /rest/v1/organizer_profiles`). |
| **Guest** | `Bearer {{guestToken}}` | Passwordless magic-link authenticated guest operations: Read/update profile, list own invitations, submit/update RSVP response, submit attendees under invitation quota, and submit headcount increase requests. |
| **Check-in Staff** | `Bearer {{checkinToken}}` | Assigned check-in helpers: Scoped event details read (`GET /rest/v1/events?id=eq.{{eventId}}`), and QR code check-in token redemption (`POST /functions/v1/checkin/scan`). |

---

## 🚀 How to Use

### 1. Import into Postman
1. Open the Postman desktop client or web app.
2. Click **Import** in the top left.
3. Drag and drop:
   - `postman/eirmis.postman_collection.json`
   - `postman/eirmis.local-mock.postman_environment.json`
   - `postman/eirmis.supabase-local.postman_environment.json` (optional)

### 2. Testing with Stoplight Prism Mock Server (Zero Backend Setup)
1. Start the Prism mock server from the project root:
   ```bash
   npm run contract:mock
   ```
   Prism starts on `http://127.0.0.1:4010`.
2. In Postman, select the environment **`EIRMIS — Local Prism Mock (4010)`** in the top right environment selector.
3. Execute any request in the collection — Prism will automatically return schema-validated mock responses corresponding to the contract examples.

### 3. Testing with Local Supabase
1. Start your local Supabase stack:
   ```bash
   npx supabase start
   ```
2. In Postman, select **`EIRMIS — Local Supabase (54321)`**.
3. Update the `anonKey` or role JWT variables (`organizerToken`, `adminToken`, etc.) with real Supabase Auth tokens if testing authenticated operations.

---

## 🔄 Regenerating the Collection

Whenever endpoints or schemas in `contract/openapi.yaml` change, regenerate the Postman collection using:

```bash
npm run contract:postman
```

# Event Invitation and RSVP Management Information System (EIRMIS)

A web-based event invitation and RSVP management system supporting four roles — **Event Organizer**, **System Administrator**, **Guest** (magic-link authenticated, no password), and **Check-in Staff** (delegated, per-event access) — for managing events, guest lists, invitations, capacity/waitlisting, reminders, and day-of check-in. Responsive across desktop and mobile.

**Project Managers:** Jomari Joseph A. Barrera · Kyle Anthony Nierras

Copyright © 2026 Jomari Joseph A. Barrera. All rights reserved. See [LICENSE.md](./LICENSE.md).

## Table of Contents

1. [Overview](#1-overview)
2. [Project Team](#2-project-team)
3. [Tech Stack](#3-tech-stack)
4. [Getting Started](#4-getting-started)
5. [Project Structure](#5-project-structure)
6. [Domain Rules & Business Logic](#6-domain-rules--business-logic)
7. [Data Model Reference](#7-data-model-reference)
8. [UI/UX Sitemap & Features](#8-uiux-sitemap--features)
9. [Design Details](#9-design-details)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Out of Scope](#11-out-of-scope)
12. [Assumptions & Decisions Log](#12-assumptions--decisions-log)
13. [Project Management & Contributing](#13-project-management--contributing)
14. [Deployment](#14-deployment)
15. [License](#15-license)
16. [Glossary](#16-glossary)
17. [Open Questions & Risks](#17-open-questions--risks)

---

## 1. Overview

EIRMIS centralizes event creation, guest list management, invitation delivery, RSVP tracking (with capacity and waitlisting), reminders, and day-of attendance scanning into a single structured, auditable source of truth spanning from "who was invited" through "who actually showed up."

**Project repository:** [Repository URL](https://github.com/<organization>/<repository>)

**Roles:**

- **Event Organizer** — creates and manages events, builds or imports guest lists, sends invitations with a per-invitation maximum headcount, reviews and approves guest-submitted attendee rosters and headcount-increase requests, monitors RSVP and capacity status, configures reminders, uploads an invitation design (image gallery or a single interactive HTML file), designates Check-in Staff, and runs check-in on the event day. Signs in with any Google account — Gmail or otherwise; there is no organization-domain restriction.
- **System Administrator** — verifies newly self-registered organizer accounts (moving them from `pending` to `active`) and manages org-wide settings. Because organizer sign-in isn't restricted to an organization email domain, this manual verification step is the *sole* trust gate for who can create events. Has no access to, and no override power over, any individual event's guest list, RSVP content, or attendee data.
- **Guest** — authenticates via a passwordless email magic link (no password, no account creation form, and no prior organizational affiliation required). Once signed in, a guest manages their own RSVP, submits the names — and optional, non-unique emails — of everyone in their party up to the organizer-set maximum, tracks each attendee's individual approval status, can request additional heads, and downloads their party's QR codes for event-day check-in.
- **Check-in Staff** — an organizer-designated helper, without full organizer login, who can scan/search and check in attendees for one specific event only, for the event day. Cannot view guest lists, RSVP details, invitation designs, or any data outside the check-in/attendance-tracking screens for that one assigned event. See §6 and §9 for the full access model.

---

## 2. Project Team

| Role | Name | GitHub Username |
|---|---|---|
| Team Leader | Fiel, Jack Jonel D. | `@BigDrems` |
| Member | Caballes, Ervin James Lenzo | `@username` |
| Member | Cerna, Ronald A. | `@Rcerna24` |
| Member | Cormanes, Jo Mari Jess Y. | `@Cormz12-26` |
| Member | Delima, Kyla Gayle | `@bluebirbb` |
| Member | Kahano, John Andrei B. | `@Andrei Kahano` |
| Member | Mendoza II, Exzon Y. | `@Floranboi` |
| Member | Nocerale, Angel M. | `@NoSeeReally` |
| Member | Oreiro, Genesis AR S. | `@nyx-garso` |
| Member | Ortula, Jebron R. | `@Jebzzzzz` |
| Member | Piangco, Pete Alexander N. | `@Filch119` |
| Member | Rodriguez, Edgar Jr. A. | `@Edgar202323` |
| Member | Suico, Gian Carlo | `@kindocarloo` |
| Member | Villasotes, Jian | `@trojian-00` |
| Member | Ybas, Martin Benedict E. | `@MarteenyWeeny` |

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 single-page app, built with Vite |
| Language | TypeScript |
| Routing | React Router (data router) |
| Server state / data fetching | TanStack Query |
| Client state | React Context + `useReducer` — session/role, active event, scanner session, and UI preferences; no third-party global store |
| Forms | React Hook Form + Zod resolver |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Supabase — PostgreSQL with Row Level Security, Auth, Storage, Realtime |
| Backend logic | Supabase Edge Functions (Deno) — every operation needing a secret, a privileged write, or multi-step orchestration |
| Scheduled jobs | `pg_cron` / Supabase scheduled Edge Function invocation — reminders, waitlist promotion, batched notifications |
| Auth | Supabase Auth — Google OAuth for Organizer/Admin (any Google account, with no organization-domain restriction); Supabase Auth passwordless email OTP ("magic link") for Guest and Check-in Staff. Supabase Auth's SMTP is configured to route through Resend so magic-link emails share branding/domain with all other transactional email. |
| File Storage | Supabase Storage — invitation gallery images and the single self-contained HTML invitation file |
| Realtime | Supabase Realtime — live attendance-tracking dashboard (a WebSocket channel, outside the OpenAPI contract — see §9) |
| API contract | OpenAPI 3.1 — `contract/openapi.yaml`, hand-authored, the single source of truth for every endpoint the frontend may call |
| API documentation | Redoc — in-app `/docs` route (auth-gated outside development) plus a static bundle published by CI (`@redocly/cli`) |
| Generated API client | `openapi-typescript` (types) + `openapi-fetch` (typed client) — generated from the contract, never hand-edited |
| Contract enforcement | `redocly lint`, a codegen-freshness check, and a PostgREST drift check — all run in CI |
| API mocking | MSW (component/e2e tests) and Prism (runnable stub server) — lets screens be built against the contract before the backend exists |
| Database types | `supabase gen types typescript` — database-side types, kept distinct from contract types |
| Migrations | Supabase CLI, SQL migration files |
| Validation | Zod on the client, mirroring the contract's request schemas; RLS, DB constraints/triggers, and Edge Function checks server-side |
| HTML Validation | DOM parser (`linkedom` via an `npm:` specifier) inside an Edge Function, for the outbound-reference structural scan on uploaded HTML invitations — see §6, §9 |
| Malware Scanning | Third-party file-scanning API (e.g. VirusTotal's file-scan endpoint) invoked from an Edge Function on HTML invitation upload, before the file is marked usable |
| QR Codes | `qrcode` (generation, in an Edge Function), `html5-qrcode` (browser scanning) |
| PDF Generation | `pdf-lib` (in an Edge Function) — bundles a party's approved-attendee QR codes into a single downloadable/emailable PDF |
| Email | Resend (transactional email + Supabase Auth SMTP), dispatched only from Edge Functions |
| Testing | Vitest + React Testing Library (unit/component), Playwright (E2E) |
| CI/CD | GitHub Actions |
| Project Management | GitHub Issues, Milestones, Projects (board), Pull Requests |
| Hosting | Vercel (static SPA build) + hosted Supabase project (database/auth/storage/realtime) |
| Node | 20.x (pin via `.nvmrc`) |
| Package manager | npm — one lockfile (`package-lock.json`); do not introduce a second package manager |

### Contract-First Convention

There is no application server between the React app and Supabase — Supabase *is* the backend. The frontend/backend boundary is therefore not a deployment boundary but a **contract**: `contract/openapi.yaml`.

The frontend never queries the database ad hoc. Every call it makes is an operation declared in the contract, and the typed client is generated from that file, so an endpoint that isn't in the contract cannot be called in a type-checking build. The contract covers two backend surfaces:

1. **PostgREST data endpoints** (`/rest/v1/<table>`) — the read and simple-write operations the app is entitled to make. Authorization is RLS, not client-side discipline.
2. **Edge Function endpoints** (`/functions/v1/<name>`) — anything that needs a secret, a privileged write, or a multi-step transaction (see [§9 API Contract](#9-design-details) for this project's full list).

Supabase auto-publishes a machine-generated OpenAPI description of PostgREST. **That is not the contract**: it exposes every column and filter on every table, changes silently with each migration, and carries no versioning. `contract/openapi.yaml` is the curated, reviewed subset the frontend is allowed to use; CI diffs the two so a migration that breaks a documented shape fails the build rather than the browser.

EIRMIS leans on this boundary hard, because it has four differently-trusted client audiences — organizer, admin, guest, and check-in staff — sharing one deployed bundle. What separates them is not which build they downloaded but which operations their JWT can complete. The contract is where that difference is written down, and RLS is where it is enforced.

---


## 4. Getting Started

### Prerequisites

- Node.js 20.x (`nvm use`)
- npm — the canonical package manager for this project; commit only `package-lock.json`
- Docker (for local Supabase)
- A Supabase project (Database, Auth, Storage, Realtime enabled), remote for staging/production
- A Google Cloud OAuth client for organizer/admin Google Sign-In — a standard OAuth consent screen is sufficient; no Google Workspace domain restriction is required or configured
- A Resend account/API key, also configured as Supabase Auth's custom SMTP provider (Supabase dashboard → Auth → SMTP Settings)
- A file-scanning API key (e.g. VirusTotal) for HTML invitation validation

### Environment Variables

Create a `.env.local` file. This is a client-side bundle: **every `VITE_`-prefixed variable is compiled into JavaScript the browser downloads, so nothing secret may appear here.**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=             # publishable anon key; RLS is what protects the data
VITE_SITE_URL=                      # e.g. http://localhost:5173 — used for OAuth/magic-link redirect URLs
VITE_STORAGE_BUCKET_DESIGNS=        # bucket name for invitation gallery images / HTML uploads
```
Every secret is an **Edge Function secret**, never an app variable — with no application server, there is no server-side app environment to hide one in:
```bash
supabase secrets set RESEND_API_KEY=...
supabase secrets set VIRUSTOTAL_API_KEY=...
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into Edge Functions by the platform automatically — do not add them to `.env.local`. Google OAuth client ID/secret and the Resend SMTP credentials are configured in the Supabase Auth provider dashboard, not as app-level environment variables at all.

### Installation

```bash
git clone <repo-url>
cd eirmis
npm install
supabase login
supabase link --project-ref <project-ref>
```

### Local Development Database

```bash
supabase start                          # spins up local Postgres, Auth, Storage, Realtime via Docker
supabase migration up                   # apply all migrations locally
supabase db seed                        # load supabase/seed.sql (sample events, guests, invitations)
supabase gen types typescript --local > src/lib/supabase/database.types.ts
supabase functions serve                # run Edge Functions locally
```
Configure Supabase Auth locally to match production: Google provider with no domain allowlist, email OTP/magic-link provider enabled, and custom SMTP pointed at Resend. Run `supabase gen types typescript` again after every schema-changing migration.

### Generating the API Client

The typed client is generated from the contract, not written by hand:
```bash
npm run contract:lint     # redocly lint contract/openapi.yaml
npm run contract:gen      # openapi-typescript → contract/generated/schema.d.ts
npm run contract:check    # fails if generated output is stale, or if PostgREST has drifted from the contract
npm run contract:docs     # build the static Redoc bundle
```
`contract/generated/` is committed so a fresh clone type-checks without network access; `contract:check` in CI keeps it honest. Redoc is also served in-app at `/docs` while the dev server is running.

### Seed Data Specification

`supabase/seed.sql` should populate enough sample data to exercise every UI state and business rule without real guest data:

- 1–2 sample Events covering both `open_registration` and `invite_only` visibility modes, and at least one in each status (`draft`, `published`, `closed`, `archived`).
- A mix of Guests with `auth_user_id` already populated (simulating a returning, already-logged-in guest) and Guests with it left `null` (never logged in yet).
- Sample Attendee rows spanning `pending`/`approved`/`rejected`, including at least one with no email (child/no-email-colleague case) and at least one flagged `is_walk_in`.
- At least one `HeadcountIncreaseRequest` in each status.
- One `InvitationDesign` in `images` mode, and two in `html` mode — one `validation_status = passed`, one `failed` — to exercise the organizer re-upload prompt without needing a live scan.
- At least one `CheckInAssignment` in each status (`invited`, `active`, `revoked`).
- Sample `ReminderSchedule` rows and a few `EmailLog` rows spanning several `type` values, to exercise notification-history views.

### Running the App

```bash
npm run dev
```
The app runs at `http://localhost:5173`.

### Available Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and produce the production bundle |
| `npm run preview` | Serve the production bundle locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Unit/component tests (Vitest + RTL) |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run contract:lint` | Lint `contract/openapi.yaml` (`redocly lint`) |
| `npm run contract:gen` | Regenerate the typed API client from the contract |
| `npm run contract:check` | Fail if the generated client is stale or PostgREST has drifted from the contract |
| `npm run contract:docs` | Build the static Redoc bundle |
| `npm run db:types` | Regenerate Supabase database types |
| `npm run functions:serve` | Run Edge Functions locally (`supabase functions serve`) |

### Troubleshooting

- **Google Sign-In fails for a personal Gmail account**: confirm the OAuth consent screen isn't accidentally restricted to "Internal" (Workspace-only) — it must be "External."
- **Magic link not arriving / expired**: confirm Supabase Auth SMTP is correctly pointed at Resend; magic links are single-use and expire on Supabase's default OTP window — request a new one from `/guest/login` or `/staff/login`.
- **HTML invitation stuck on "pending" validation**: the malware scan is asynchronous; check `InvitationDesign.validation_status` — if `failed`, see `validation_notes` for what to fix and re-upload.
- **Migrations out of sync locally**: run `supabase migration up` before `supabase db seed`; if types drift, re-run the `supabase gen types typescript --local` command above.
- **RLS denies an expected read/write in local testing**: confirm you're testing with an authenticated Supabase session (not the anon key alone) matching the role/assignment being tested — see §9 for the RLS policy shape per role.
- **404 on a deep link after deploy**: the SPA needs a catch-all rewrite to `index.html` (see [§14](#14-deployment)) — without it, only `/` resolves, which breaks every emailed link into `/guest/*`.
- **`contract:check` fails after a migration**: PostgREST's shape changed but `contract/openapi.yaml` wasn't updated. Update the contract, re-run `contract:gen`, and commit both.
- **Emails not sending locally**: `RESEND_API_KEY` is an Edge Function secret, so `supabase functions serve` must be running and the secret set (`supabase secrets list`) — the SPA has no path to Resend of its own.

---

## 5. Project Structure

```
contract/
  openapi.yaml               # THE contract — single source of truth for every callable endpoint
  redocly.yaml               # lint ruleset + Redoc theme config
  generated/                 # openapi-typescript output (committed, CI-verified fresh, never hand-edited)
src/
  main.tsx                   # app entry; mounts providers
  App.tsx                    # router + provider composition
  routes/
    auth/                    # organizer/admin login, pending-verification screen
    organizer/
      events/:id/
        approvals/           # attendee + headcount-request approval queue
        design/              # invitation design upload (gallery manager / HTML uploader)
        attendance/          # live check-in tracking dashboard
        checkin/             # scanning UI
        staff/               # manage Check-in Staff assignments for this event
        guests/              # guest list build/import
        reminders/           # reminder schedule configuration
    admin/
      organizers/            # organizer verification queue
      settings/              # org-wide settings
    guest/
      login/                 # magic-link request
      dashboard/             # cross-event list of the guest's invitations
      events/:eventId/
        attendees/           # roster submission & status
        request-heads/       # headcount increase request
        qr/                  # QR bundle download
    staff/
      login/                 # check-in staff magic-link request
      events/:eventId/
        checkin/             # scoped scanning UI
    register/:slug/          # public open-registration form (no auth)
    docs/                    # in-app Redoc viewer (auth-gated outside development)
  components/
    ui/                      # shadcn/ui primitives
    gallery/                 # invitation image gallery/lightbox viewer
    invitation-frame/        # sandboxed HTML invitation renderer
    approvals/               # approval queue tables
    qr/                      # QR bundle preview
  context/                   # React Context providers (see §9 State Management)
    SessionContext.tsx       # session + which of the four identities is signed in
    EventContext.tsx         # the event being worked on, shared across all /organizer/events/:id screens
    ScannerContext.tsx       # camera/scan session state for the check-in screens
    PreferencesContext.tsx   # theme, table density, persisted UI preferences
  lib/
    api/                     # openapi-fetch client bound to contract/generated: auth header, error mapping
    supabase/                # supabase-js browser client (auth, storage, realtime), generated database types
    validation/              # Zod schemas mirroring the contract's request bodies
    realtime/                # attendance-dashboard channel subscription (outside the contract — see §9)
  hooks/                     # TanStack Query hooks, one per contract operation
supabase/
  migrations/
  functions/                 # Edge Functions — each one an operation in contract/openapi.yaml
    upload-invitation-html/  # structural scan + scan queueing
    html-scan-callback/      # third-party scanner webhook
    decide-attendee/         # approve/reject with capacity soft-check + audit
    decide-headcount/        # headcount-request decision
    qr-bulk-dispatch/        # QR PDF bundling + email
    send-reminders/          # scheduled reminder dispatch
    promote-waitlist/        # FIFO waitlist promotion
    checkin-scan/            # QR token redemption
  seed.sql
.github/workflows/
```

Note what is *absent* from `src/`: no `email/`, no `qrcode/`. Resend and QR/PDF generation need secrets or must not be forgeable by a client, so they exist only under `supabase/functions/`.

---

## 6. Domain Rules & Business Logic

### Users & Roles

- Organizer accounts self-register via Google Sign-In using **any** Google account.
- A newly self-registered organizer account starts in `pending` status and has no event-creation access until a System Administrator manually verifies and activates it. This manual verification is the sole trust gate for organizer accounts.
- System Administrators are provisioned directly (not self-registered) and manage org-wide settings only.
- Guests authenticate via Supabase Auth's passwordless email magic link. A Guest directory row (see §7) may exist before the person ever logs in — created by an organizer building an invite-only list, or by the guest's own submission on an open-registration event page. The row's `auth_user_id` is populated lazily, the first time that email successfully completes a magic-link login. Guests can only ever see and manage their own invitations, attendee rosters, and requests, enforced via RLS keyed on `auth.uid()`.
- Check-in Staff are granted access to a single event only, for the event day, and cannot view guest lists, RSVP details, or any data outside the check-in/attendance-tracking screens.

### Events

Each Event is organizer-owned and has: a capacity ceiling, an RSVP deadline, a `visibility_mode` of `open_registration` (public, self-service submission via a shareable slug link) or `invite_only` (organizer builds/imports the guest list, no public entry point), and a status lifecycle of `draft` → `published` → `closed` → `archived`. Only a `published` event accepts guest actions (RSVP responses, attendee submissions, headcount requests); `closed` and `archived` events are read-only for guests.

### Invitation Design (Creative Assets)

- Each Event has zero or one `InvitationDesign`, of type `images` (gallery) or `html` (single interactive file).
- **Images mode**: the organizer uploads one or more images to an ordered gallery; guests view it as a responsive lightbox/gallery, not as a raw file list.
- **HTML mode**: the organizer uploads exactly **one self-contained `.html` file** — no external assets. Everything must be inline (base64-embedded images/fonts, inline `<style>`/`<script>`). This upload goes through a two-stage validation pipeline before it becomes visible to any guest:
  1. **Static structural scan** — a server-side HTML parse rejects the file if it contains any reference that would leave the document: external `http(s)://` or protocol-relative URLs in `href`, `src`, or `action`; `<iframe>`; `<link>`; CSS `@import`/`url(http...)`; or a meta-refresh redirect. Only `data:` URIs and in-page `#anchor` links are permitted. This step is synchronous and gives the organizer immediate feedback.
  2. **Malware/heuristic scan** — the file is submitted to a third-party file-scanning service. This step is asynchronous; the design remains `validation_status = pending` (visible only to the organizer, never to guests) until the scan completes.
- Only a file that passes both stages (`validation_status = passed`) is ever served to guests. A file that fails either stage (`validation_status = failed`) is never served, and the organizer sees a plain-language `validation_notes` message (e.g., *"This file links to something outside itself, which isn't allowed — please remove external links/scripts and re-upload"*) prompting a re-upload.
- Regardless of validation outcome, guest-facing rendering always happens inside a sandboxed iframe (`sandbox="allow-scripts"`, deliberately without `allow-same-origin`) under a strict per-route Content-Security-Policy. This is a second, independent layer of containment — arbitrary JavaScript can't be fully verified by static analysis alone, so the browser itself blocks any outbound network attempt regardless of what slipped past the scan. Full mechanics in §9.
- An event may have no design at all, in which case guests see a default system-branded invitation view.

### Guest Directory & Invitations

- `Guest` is a standing, cross-event directory entity, deduplicated by email, optionally linked to a Supabase Auth identity via `auth_user_id`.
- Each `Invitation` carries a `max_party_size` set by the organizer at send time — the ceiling on total heads for that invitation, including the invited guest themself.
- When a guest accepts an invitation, they are automatically recorded as `Attendee #1` (`is_primary = true`, auto-`approved`, no organizer review needed). The guest then submits up to `max_party_size − 1` additional attendees: full name required, email optional and explicitly **not** required to be unique — the same email may appear on more than one Attendee row (e.g., children without their own address, or colleagues sharing contact info), and an Attendee may have no email at all.
- `Invitation.party_size` is a cached, trigger-maintained count of that invitation's `approved` Attendees — not a number the guest types in directly. This is what capacity and waitlist logic key off (see below).
- A `tentative` invitation status means the guest has indicated interest but has not yet committed to `accepted`; a tentative invitation does not reserve capacity and does not permit attendee-roster or headcount-request submission until it becomes `accepted`.
- Declining an invitation requires no attendee roster submission.
- For an `open_registration` event, a public submission at `/register/:slug` creates (or matches, by email) a `Guest` row and an `accepted` `Invitation` directly — no organizer review is required for the invitation itself, only for the attendee roster it then allows. The confirmation email sent afterward includes a magic-link so the submitter can log in and subsequently manage their RSVP, attendee roster, and headcount requests through the same authenticated `/guest/*` routes as an invite-only guest.
- There is no bare-token link (`/invite/[token]`) as the access mechanism; access is via authenticated `/guest/*` routes reached through magic-link login.

### Attendee Roster & Approval

- Every additional Attendee a guest submits starts at `status = pending` and does **not** reserve event capacity while pending.
- The organizer reviews attendees **one at a time** — approve or reject each individually — in a per-event approval queue. Each decision is an audited action.
- Approving an attendee that would push the event's accepted headcount over capacity is a **soft check**: the organizer sees a warning and may proceed anyway (an audited override), consistent with how walk-ins and capacity-reduction overrides are already handled elsewhere in this system. It never silently blocks the approval.
- Guest-facing notification of attendee decisions is **batched**, not sent per individual attendee: whenever the organizer has cleared every currently-pending attendee for that invitation, a single consolidated email goes to the guest's own email (e.g., *"3 of 4 in your party are confirmed — here's the breakdown"*). Because a rejected attendee can be resubmitted (re-entering `pending`), this "roster fully resolved" condition can be reached more than once for the same invitation; the batched email fires again each time it is newly reached. An organizer can also manually trigger a partial-progress update at any time mid-review.
- A rejected attendee can be edited and resubmitted by the guest, re-entering `pending`, still bounded by `max_party_size`.

### Headcount Increase Requests

- A guest whose party is already at `max_party_size` can submit a `HeadcountIncreaseRequest` (a requested number of additional heads, plus an optional note).
- The organizer approves or rejects the request as a whole (no partial approval in v1 — see §11, §17). Approval raises that invitation's `max_party_size` by the approved amount, after which the guest can submit that many additional Attendee rows.
- Rejection sends a single notification to the guest.

### Capacity & Waitlist

- An atomic, database-trigger-enforced check guards the event's capacity ceiling, keyed off `Invitation.party_size` (itself trigger-maintained from approved-Attendee count).
- Waitlist promotion is strict FIFO. A promoted invitation's previously-pending attendees remain `pending` and still require organizer review; promotion only lifts the Invitation-level block on accepting, it does not auto-approve anyone.

### RSVP Deadline & Locking

Once an event's RSVP deadline passes, invitations lock against further status changes and further attendee-roster edits (submission of new attendees or headcount requests also locks at this point).

### QR Issuance & Bulk Delivery

- Each Attendee — including the auto-created primary guest record — is issued a signed, unique `qr_token` the moment their `status` becomes `approved`.
- QR dispatch fires **automatically** each time an invitation newly reaches zero remaining `pending` attendees (i.e., the whole roster is resolved): every approved Attendee's QR code is bundled into a single multi-page PDF (one QR code + attendee name per page) and emailed once to the guest's own email address. As with the batched status email above, this can fire more than once for the same invitation across multiple review rounds if attendees are rejected, resubmitted, and later approved.
- Organizers additionally have a **manual** "Send/Resend QR Codes" action, usable per invitation or in bulk across every confirmed invitation in an event — for catching stragglers after the RSVP deadline, or resending a lost email.
- The same QR PDF is available for the guest to re-download anytime from their `/guest/*` portal.

### Check-in

- Each Attendee's QR encodes their own `qr_token`, not an invitation-level token — scanning checks in that individual specifically. `checked_in`, `checked_in_at`, and `checked_in_by` are recorded per Attendee.
- `Invitation.checked_in_count` is retained as a cached rollup (count of that invitation's checked-in Attendees) for reporting convenience, not as the primary record.
- A walk-in creates an ad hoc Attendee row (`is_walk_in = true`, no prior roster entry) rather than a flag on the Invitation.
- Manual name/email search fallback (for a lost or unscannable QR) searches Attendees, not Invitations.
- A live attendance-tracking dashboard, separate from the active scanning screen, shows real-time expected-vs-checked-in counts and a searchable attendee list — see §8, §9.

### Check-in Staff & Delegated Access

- An organizer designates Check-in Staff on a per-event basis by email, creating a `CheckInAssignment` row (`status = invited`).
- The designated person signs in via the same passwordless magic-link mechanism as Guests (from `/staff/login`), but their auth identity links through `CheckInAssignment.auth_user_id`, a separate identity space from `Guest`.
- Once signed in, access is restricted to the single assigned event's check-in/scanning screen and attendance-tracking dashboard; a Check-in Staff member has no visibility into guest lists, RSVP details, invitation designs, approval queues, or any other event.
- Check-in Staff cannot approve/reject attendees or headcount requests, upload or edit an invitation design, or change any event setting — check-in scanning and search only.
- An organizer can revoke a `CheckInAssignment` at any time (`status → revoked`), immediately cutting off that person's access; access is otherwise intended to be used for the event day only.

### Reminders & Notifications

Scheduled reminders (e.g. T-7-day, T-1-day before the event) are configured per event as `ReminderSchedule` rows and fired by the `sendReminders` Edge Function on a `pg_cron` schedule. Transactional email types include: `invitation_sent`, `rsvp_confirmation`, `waitlist_promoted`, `reminder`, `attendee_status_update` (batched approval/rejection summary to the guest), `headcount_request_submitted` (to organizer), `headcount_request_decided` (to guest), `qr_codes_issued` (to guest, with the QR PDF attached), `invitation_design_validation_failed` (to organizer only), and `organizer_account_verified` (to organizer, on admin activation).

### Audit & Integrity

All state-changing actions are logged to `AuditLogEntry`, including: `attendee.approved`, `attendee.rejected`, `attendee.approved_over_capacity`, `headcount_request.approved`, `headcount_request.rejected`, `invitation_design.uploaded`, `invitation_design.validation_failed`, `qr.bulk_sent`, `checkin.attendee_scanned`, `checkin_assignment.granted`, `checkin_assignment.revoked`, `organizer.verified`. The audit log is append-only/immutable at the DB level.

---

## 7. Data Model Reference

### Entity Glossary

| Entity | Purpose |
|---|---|
| OrganizerProfile | Base identity for an Event Organizer (linked 1:1 to `auth.users.id`), verification status |
| Event | An organizer-owned event: capacity, RSVP deadline, visibility mode, status lifecycle |
| ReminderSchedule | Configured scheduled-reminder offsets (e.g. T-7, T-1) for an event |
| Guest | Cross-event directory row, deduplicated by email; optionally linked to a Supabase Auth identity |
| Invitation | Per-event, per-guest invitation; `party_size`/`checked_in_count` are cached rollups, not directly-entered values; no bare-token access field |
| Attendee | One row per person in an invitation's party — the guest themself plus every additional name they submit |
| HeadcountIncreaseRequest | A guest's request to raise their invitation's `max_party_size` |
| InvitationDesign | An event's creative-asset configuration: image gallery or single validated HTML file |
| InvitationImage | One image within an event's gallery-mode invitation design |
| CheckInAssignment | A per-event delegation of check-in access to a Check-in Staff member, with its own auth linkage |
| EmailLog | Record of every transactional email sent, across all email types |
| AuditLogEntry | Immutable change/action record |

### Field-Level Schema Sketch

This is a lightweight starting point for migration authoring, not final DDL — types, constraints, and indexes should be refined during actual schema implementation.

**OrganizerProfile**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | equals `auth.users.id` |
| `email` | text, unique, not null | |
| `full_name` | text, not null | |
| `status` | enum(`pending`,`active`) | default `pending`; admin-only to change |
| `created_at`, `updated_at` | timestamptz | |

**Event**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `organizer_id` | uuid, FK → OrganizerProfile, not null | |
| `title` | text, not null | |
| `slug` | text, unique, not null | used in `/register/:slug` for `open_registration` events |
| `description` | text, nullable | |
| `starts_at`, `ends_at` | timestamptz, not null | |
| `location` | text, nullable | |
| `capacity` | int, not null | ceiling checked atomically against approved-Attendee count |
| `rsvp_deadline` | timestamptz, not null | |
| `visibility_mode` | enum(`open_registration`,`invite_only`) | not null |
| `status` | enum(`draft`,`published`,`closed`,`archived`) | not null, default `draft` |
| `created_at`, `updated_at` | timestamptz | |

**ReminderSchedule**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `event_id` | uuid, FK → Event, not null | |
| `days_before_event` | int, not null | e.g. `7`, `1` |
| `enabled` | boolean, not null, default true | |
| `last_sent_at` | timestamptz, nullable | set once the scheduled job dispatches this reminder |

**Guest**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `email` | text, unique, not null | deduplication key across the directory |
| `full_name` | text, not null | |
| `auth_user_id` | uuid, nullable, FK → `auth.users.id` | populated on first successful magic-link login; may be `null` for organizer-added or self-registered guests who haven't logged in yet |
| `created_at`, `updated_at` | timestamptz | |

**Invitation**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `event_id` | uuid, FK → Event, not null | |
| `guest_id` | uuid, FK → Guest, not null | |
| `status` | enum(`pending`,`accepted`,`declined`,`tentative`,`waitlisted`) | |
| `max_party_size` | int, not null | organizer-set ceiling on total heads for this invitation, including the guest; raised by an approved `HeadcountIncreaseRequest` |
| `party_size` | int | **cached**, trigger-maintained count of this invitation's `approved` Attendees — not directly editable |
| `checked_in_count` | int | **cached**, trigger-maintained count of this invitation's checked-in Attendees |
| `dietary_preference`, `special_requests` | text, nullable | |
| `invited_by` | uuid, FK → OrganizerProfile, nullable | null for guest-initiated (open-registration) invitations |
| `invited_at`, `responded_at`, `waitlisted_at` | timestamptz, nullable | |
| `created_at`, `updated_at` | timestamptz | |

**Attendee**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `invitation_id` | uuid, FK, not null | |
| `full_name` | text, not null | |
| `email` | text, nullable | **not unique** — the same email may appear on multiple Attendee rows, or be absent entirely |
| `is_primary` | boolean, not null, default false | true only for the auto-created record representing the inviting guest |
| `status` | enum(`pending`,`approved`,`rejected`) | `is_primary` rows are created directly as `approved` |
| `qr_token` | text, unique, nullable | nullable until `status = approved` |
| `submitted_at` | timestamptz | |
| `reviewed_by` | uuid, FK → OrganizerProfile, nullable | |
| `reviewed_at`, `review_reason` | nullable | |
| `checked_in`, `checked_in_at`, `checked_in_by` | nullable | `checked_in_by` may reference an OrganizerProfile or a CheckInAssignment |
| `is_walk_in` | boolean, not null, default false | |

**HeadcountIncreaseRequest**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `invitation_id` | uuid, FK, not null | |
| `requested_additional_heads` | int, not null | |
| `status` | enum(`pending`,`approved`,`rejected`) | |
| `note` | text, nullable | guest-provided reason |
| `requested_at` | timestamptz | |
| `reviewed_by`, `reviewed_at`, `review_reason` | nullable | |

**InvitationDesign**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `event_id` | uuid, FK, unique | an event has zero or one design |
| `design_type` | enum(`images`,`html`) | |
| `html_storage_path` | text, nullable | required if `design_type = html`; Supabase Storage path |
| `validation_status` | enum(`pending`,`passed`,`failed`) | only `passed` HTML designs are ever served to guests |
| `validation_notes` | text, nullable | plain-language message for the organizer when `failed` |
| `validated_at` | timestamptz, nullable | |
| `created_at`, `updated_at` | timestamptz | |

**InvitationImage**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `event_id` | uuid, FK, not null | |
| `storage_path` | text, not null | Supabase Storage path |
| `sort_order` | int, not null | gallery display order |
| `caption` | text, nullable | |
| `created_at` | timestamptz | |

**CheckInAssignment**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `event_id` | uuid, FK → Event, not null | |
| `staff_email` | text, not null | |
| `auth_user_id` | uuid, nullable, FK → `auth.users.id` | populated on first successful magic-link login, same lazy-linkage pattern as Guest |
| `invited_by` | uuid, FK → OrganizerProfile, not null | |
| `status` | enum(`invited`,`active`,`revoked`) | default `invited`; becomes `active` on first login, `revoked` when the organizer cuts off access |
| `created_at`, `updated_at` | timestamptz | |

**EmailLog**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `event_id` | uuid, FK → Event, nullable | null for org-wide/admin-facing emails |
| `recipient_email` | text, not null | |
| `type` | text, not null | see the type list in §6 (Reminders & Notifications) |
| `provider_message_id` | text, nullable | Resend's message ID, for delivery troubleshooting |
| `status` | enum(`queued`,`sent`,`failed`) | |
| `sent_at` | timestamptz, nullable | |
| `created_at` | timestamptz | |

**AuditLogEntry**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `actor_type` | enum(`organizer`,`guest`,`system`) | `system` for scheduled-job-triggered events |
| `actor_id` | uuid, nullable | FK to OrganizerProfile or Guest depending on `actor_type`; null when `actor_type = system` |
| `action` | text, not null | e.g. `attendee.approved`, `checkin_assignment.revoked` |
| `entity_type`, `entity_id` | text / uuid, not null | |
| `old_value`, `new_value` | jsonb, nullable | |
| `reason` | text, nullable | |
| `created_at` | timestamptz, not null | append-only/immutable at the DB level |

### Relationship / Cardinality Summary

| Entity A | Relationship | Entity B | Cardinality |
|---|---|---|---|
| OrganizerProfile | owns | Event | 1 : many |
| Event | has | ReminderSchedule | 1 : many |
| Event | has (via Guest) | Invitation | 1 : many |
| Guest | has | Invitation | 1 : many, across events |
| Invitation | has | Attendee | 1 : many |
| Invitation | has | HeadcountIncreaseRequest | 1 : many |
| Event | has (optional) | InvitationDesign | 1 : 0..1 |
| Event | has | InvitationImage | 1 : many |
| Guest | linked to (optional) | `auth.users` | 1 : 0..1 |
| Event | has | CheckInAssignment | 1 : many |
| CheckInAssignment | linked to (optional) | `auth.users` | 1 : 0..1 |
| Any auditable entity | generates | AuditLogEntry | 1 : many |
| Event/Guest/OrganizerProfile | generates (as recipient context) | EmailLog | 1 : many |

---

## 8. UI/UX Sitemap & Features

Client-side routes, resolved by React Router; parameters use `:param` syntax.

### Public / Auth

- `/login` — organizer/admin Google Sign-In (any Google account)
- `/pending-verification` — shown to organizers awaiting admin activation
- `/guest/login` — guest enters their email, requests a magic link
- `/staff/login` — check-in staff enters their email, requests a magic link
- `/register/:slug` — public open-registration form (unauthenticated submission)
- `/docs` — Redoc view of `contract/openapi.yaml`; open in development, authenticated-only in deployed environments

### Guest Portal

- `/guest/dashboard` — cross-event list of the guest's invitations
- `/guest/events/:eventId` — invitation details, RSVP status, invitation design view (gallery or sandboxed HTML)
- `/guest/events/:eventId/attendees` — roster submission and per-attendee status
- `/guest/events/:eventId/request-heads` — submit a headcount increase request
- `/guest/events/:eventId/qr` — download the party's QR PDF

### Organizer Portal

- `/organizer/events` — list and create events
- `/organizer/events/:id` — event overview/edit: capacity, RSVP deadline, visibility mode, status
- `/organizer/events/:id/guests` — build or import the guest list
- `/organizer/events/:id/reminders` — configure scheduled reminders
- `/organizer/events/:id/approvals` — attendee approval queue and headcount-request queue
- `/organizer/events/:id/design` — upload/manage invitation design (gallery manager or HTML uploader with validation status)
- `/organizer/events/:id/attendance` — live attendance-tracking dashboard (counts, searchable attendee list)
- `/organizer/events/:id/checkin` — active scanning screen
- `/organizer/events/:id/staff` — manage Check-in Staff assignments for this event
- `/organizer/profile` — edit own organizer profile

### Admin Portal

- `/admin/organizers` — organizer verification queue
- `/admin/settings` — org-wide settings

### Check-in Staff Portal

- `/staff/events/:eventId/checkin` — scoped scanning screen for the one assigned event

---

## 9. Design Details

### Architecture

A React SPA talks to Supabase (Postgres, Auth, Storage, Realtime) over HTTP, and only through operations declared in `contract/openapi.yaml`. Read-heavy views (guest lists, approval queues, attendance rosters) are TanStack Query reads against PostgREST endpoints, where RLS decides what the caller may see. Writes split by whether the client can be trusted with them:

- **Simple, single-row writes** (event edits, a guest's own attendee-roster rows, reminder schedule changes) go straight to PostgREST under RLS.
- **Anything carrying a secret, a forgeable token, or an invariant spanning rows** goes through an Edge Function: attendee decisions (capacity soft-check + audit + notification), QR issuance and bundling, check-in scans, HTML invitation upload and scanning, and every outbound email.

There is no application server of our own, and the SPA is the least trusted component: one bundle serves organizers, admins, guests, and check-in staff alike, and it runs on machines those people control. The four roles are separated by what their JWT can complete, never by which screens the bundle chooses to render.

Two Supabase capabilities sit deliberately **outside** the OpenAPI contract, because they are not HTTP request/response: **Realtime** subscriptions (the attendance dashboard's WebSocket channel) and **Storage** signed-URL reads for gallery images. Both are used through `supabase-js` directly and are documented here in §9 rather than in the contract. Everything else the frontend does is a contract operation.

### API Contract (OpenAPI 3.1 + Redoc)

**Source of truth.** `contract/openapi.yaml` is hand-authored and reviewed like code. It is the interface between whoever builds screens and whoever builds schema/functions, and it is written *before* either side is implemented.

**Layout and versioning.** Supabase fixes the path prefixes (`/rest/v1`, `/functions/v1`), so the contract carries its own semver in `info.version`. A breaking change (removing a field, tightening a type, changing an operation's meaning) requires a major bump plus a migration note in the PR description; additive changes are minor.

**Operations.** Every operation has a stable `operationId` in camelCase (`listEventInvitations`, `decideAttendee`, `requestHeadcountIncrease`, `scanCheckIn`), which is what the generated client's method names derive from. Operations are grouped by portal with `x-tagGroups` (Organizer / Admin / Guest / Check-in Staff / Public), so Redoc's sidebar mirrors the app's four audiences — and so it is immediately visible which operations a guest or staff token is expected to reach.

**Auth.** One `bearerAuth` security scheme (the Supabase JWT) is declared globally. The genuinely public operations — the open-registration submission at `/register/:slug` and its event lookup — opt out explicitly with `security: []`, and are the only ones that may. The contract documents, per operation, *which of the four identities can succeed*; RLS is the enforcement, but an undocumented 403 is a contract bug.

**Error model.** A single `Error` schema matching PostgREST's `{ code, message, details, hint }`. Edge Functions must return the same shape and status codes, so `src/lib/api` has exactly one error path regardless of which surface answered. Domain-specific outcomes that are not failures — a capacity soft-check warning, an already-checked-in scan — are documented as successful responses with a discriminated payload, not as errors, so the UI can distinguish "this needs your confirmation" from "this went wrong."

**Edge Function operations for this system:**

| Operation | Endpoint | Why it can't be a plain PostgREST write |
|---|---|---|
| `uploadInvitationHtml` | `POST /functions/v1/invitation-html` | Runs the synchronous structural scan before the file is stored, then queues the malware scan; the file must never be storable un-scanned |
| `handleScanCallback` | `POST /functions/v1/html-scan-callback` | Third-party scanner webhook; verifies the callback signature and flips `validation_status`. Service-role only, not reachable from the SPA |
| `decideAttendee` | `POST /functions/v1/attendees/{id}/decision` | Approve/reject with the capacity soft-check, the audited override, QR issuance on approval, and the audit entry — one transaction |
| `decideHeadcountRequest` | `POST /functions/v1/headcount-requests/{id}/decision` | Raises `max_party_size` and records the decision together |
| `dispatchQrBundle` | `POST /functions/v1/qr-bundle` | Generates the multi-page PDF and sends it through Resend; holds `RESEND_API_KEY`. Backs both the automatic and manual send paths |
| `scanCheckIn` | `POST /functions/v1/checkin/scan` | Redeems a `qr_token`: verifies its signature, checks the scanner's assignment scope, and records the check-in. A client-side check-in write would be forgeable |
| `sendReminders` | `POST /functions/v1/reminders/dispatch` | Scheduled by `pg_cron`; service-role only |
| `promoteWaitlist` | `POST /functions/v1/waitlist/promote` | FIFO promotion across invitations; must run privileged and atomically |

**Generated client.** `openapi-typescript` produces `contract/generated/schema.d.ts`; `openapi-fetch` wraps it into a typed client in `src/lib/api`, which attaches the current access token and normalizes errors. Query hooks in `src/hooks` are thin wrappers, one per operation. `supabase-js` is imported only for auth, Storage, and Realtime — never for table access.

**Drift detection.** After migrations run in CI, `contract:check` fetches the live auto-generated PostgREST description and compares it against every PostgREST path the contract documents. A migration that renames a column or changes a type fails CI, rather than surfacing as a runtime error in the browser.

**Documentation.** Redoc renders the contract two ways, deliberately: an in-app `/docs` route (the `redoc` React component, so contributors read the same spec the running build uses — gated behind an authenticated session outside development), and a static bundle built by `redocly build-docs` in CI, published as a build artifact so the contract is browsable without running anything.

### Auth & Session Flow

All four identities use the `supabase-js` browser client, with the session persisted in browser storage and refreshed automatically. `SessionContext` subscribes to `onAuthStateChange` and resolves which of the four identities is signed in — organizer/admin profile, `Guest`, or `CheckInAssignment` — exposing that to the tree so route guards, the API client, and role-conditional rendering all read one source.

- **Organizer/Admin**: Google OAuth via Supabase Auth, with no organization-email gate. Access still requires `status = active` (post-admin-verification), enforced by RLS rather than by the client's redirect.
- **Guest**: guest visits `/guest/login`, enters their email, and Supabase Auth sends a single-use magic link (via Resend SMTP). Clicking it verifies the OTP and establishes a session. On first successful login for a given email, the `Guest.auth_user_id` linkage is made (creating a `Guest` row if none exists yet for that email) — by a database trigger on `auth.users`, not by client code, so the linkage cannot be skipped or aimed at someone else's row. All `/guest/*` routes require this session; there is no separate password or profile-creation step. Invitation emails deep-link into `/guest/login?email=...&next=/guest/events/:eventId` to pre-fill the email field, but the guest still must complete the magic-link step — there is no bypass.
- **Check-in Staff**: identical mechanism to Guest (`/staff/login`, magic link), but the linkage trigger attaches `auth.users.id` to `CheckInAssignment.auth_user_id` instead of `Guest.auth_user_id`, and flips the assignment's `status` from `invited` to `active`. Scope is checked on every request by RLS against the assignment's `event_id` and `status = active` — the `/staff/*` route guard is only a redirect convenience.

### Data Access & RLS

- **Organizer/Admin**: RLS scoped to owned events (organizer) or `active` admin status (admin); admins have no read/write access to Attendee, Invitation, or InvitationDesign content.
- **Guest**: a guest can `SELECT` their own Invitations and Attendees (joined via `Guest.auth_user_id = auth.uid()`), and `INSERT`/`UPDATE` their own Attendee roster rows and `HeadcountIncreaseRequest` rows — subject to the invitation not being locked (§6). A guest has no visibility into any other guest's data, nor into organizer-only fields (e.g., internal notes).
- **Check-in Staff**: a Check-in Staff session can `SELECT` Attendee rows and `UPDATE` only the check-in fields (`checked_in`, `checked_in_at`, `checked_in_by`) for the single event referenced by their `active` `CheckInAssignment` (joined via `CheckInAssignment.auth_user_id = auth.uid()`), and has no access to any other table or any other event.

### Capacity Enforcement

An atomic, database-trigger-enforced check fires on changes to `Attendee.status` (recomputing `Invitation.party_size`) and blocks any change that would push the event over its capacity ceiling, except where an organizer has explicitly issued an audited override.

### Waitlist Promotion

Strict FIFO mechanism. Promotion unblocks the Invitation only — any attendees already submitted remain `pending` and still require organizer approval.

### Attendee Approval Workflow

The organizer's approval queue (`/organizer/events/:id/approvals`) lists pending Attendees and pending `HeadcountIncreaseRequest`s across the event, grouped by invitation. Approve/reject actions call `decideAttendee` per row, which performs the capacity soft-check, writes the decision and its audit entry, and issues the QR token on approval — atomically, so a decision can never be half-applied. A scheduled Edge Function watches for invitations that newly reach zero remaining pending attendees and fires the batched `attendee_status_update` email; the organizer can also trigger it manually mid-review for a partial update.

### QR Code Generation & Bulk Delivery

On an Attendee reaching `status = approved`, `decideAttendee` generates a signed `qr_token` inside the Edge Function, using a signing secret the client never sees — this is what makes a scanned code unforgeable, and it is why check-in cannot be a plain table write. When an invitation's roster newly resolves (no pending attendees remain), `dispatchQrBundle` renders one PDF page per approved Attendee (QR + name) via `pdf-lib` and emails it once to the guest's address. The same function backs the organizer's manual send/resend action and the guest's in-portal download.

### Invitation Design Rendering & Sandboxing

- **Upload pipeline**: the browser does not write to Storage directly for HTML designs — it posts the file to `uploadInvitationHtml`, which parses it with `linkedom` and rejects it synchronously if it contains any `href`/`src`/`action` pointing outside the document, an `<iframe>`, a `<link>`, a CSS `@import`/`url(http...)`, or a meta-refresh. Only a file that passes is stored, and it is stored already queued for the asynchronous malware/heuristic scan (e.g. VirusTotal, whose API key is an Edge Function secret). `validation_status` moves from `pending` to `passed` or `failed` when `handleScanCallback` fires, with a plain-language `validation_notes` message on failure. Storage RLS forbids client writes to the designs bucket, so the scan cannot be bypassed by uploading around the function.
- **Guest-facing rendering**: regardless of validation outcome, a `passed` HTML design is only ever rendered inside a sandboxed `<iframe sandbox="allow-scripts">` (deliberately omitting `allow-same-origin`, so even inline script can't reach cookies, storage, or the parent frame). The frame's source is a signed Storage URL on Supabase's own origin, not the app's — so the invitation is cross-origin from the SPA even before the sandbox attribute applies. The CSP restricting it (`default-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; img-src data:`) is delivered as a response header rule in `vercel.json` for the app's routes; a static SPA has no per-request middleware, so this is configuration rather than code, and it must be reviewed as such. This containment is independent of and in addition to the upload-time scan — arbitrary JavaScript logic can't be fully verified by static parsing alone, so this is the real backstop against anything that slips through.
- **Images mode** carries no equivalent risk profile (static assets only) and is served directly from Storage with standard signed URLs.

### Realtime Attendance Tracking

The `/organizer/events/:id/attendance` dashboard subscribes to a Supabase Realtime channel on the Attendee table (filtered by event) so check-in counts and the attendee list update live as scans happen on `/checkin` or `/staff/events/:eventId/checkin`, without polling. This is a WebSocket channel via `supabase-js`, not an HTTP operation, so it is **not** part of the OpenAPI contract — it is documented here instead, and its access is governed by the same RLS policies as the equivalent reads. Incoming events invalidate the relevant TanStack Query keys rather than mutating component state directly, so the live dashboard and any manual refetch converge on the same data.

### Email Delivery & Scheduled Reminders

All transactional email is sent through Resend from Edge Functions — `RESEND_API_KEY` exists nowhere else — and logged to `EmailLog`, covering the full set of email types listed in §6 (event lifecycle emails, scheduled reminders, and the attendee/headcount/QR/design notification types). Batched attendee-status emails and QR-bundle emails are dispatched by scheduled functions rather than inline in the organizer's request, so an approval never blocks on email delivery.

### Component & Styling Conventions

Shared Tailwind + shadcn/ui primitives across all portals (Guest, Organizer, Admin, Check-in Staff), with role-specific layouts. The gallery viewer and sandboxed HTML frame both need full keyboard navigation and a visible focus state (lightbox close/next/prev; iframe title/label for screen readers).

### Responsive Design

Mobile-first for Guest and Check-in Staff portals, since both are commonly used on a phone (RSVP on the go; scanning at an event's entrance). Organizer/Admin portals are desktop-first with responsive fallback.

### Accessibility

WCAG 2.1 AA target across all portals: semantic HTML, sufficient color contrast, keyboard operability for every interactive element, and screen-reader labeling for non-text content (QR previews, gallery images, scan-result indicators).

### State Management

Three tiers, kept deliberately separate:

- **Server state — TanStack Query.** Everything that lives in Postgres: guest lists, invitations, approval queues, attendance rosters, email history. Query keys are derived from the contract's `operationId` plus its parameters, so invalidation after a mutation is mechanical — approving an attendee invalidates exactly the queries that could have contained them, and the Realtime channel pushes into the same keys rather than a parallel copy.
- **Client state — React Context.** Cross-cutting state that isn't server data and would otherwise be prop-drilled through most of the tree:
  - `SessionContext` — the session plus which of the four identities is signed in (organizer/admin profile, `Guest`, or `CheckInAssignment`). Route guards, the API client's auth header, and every role-conditional render read from here. With four audiences sharing one bundle, having a single answer to "who is this?" matters more here than in the other two systems.
  - `EventContext` — the event currently being worked on, shared by every screen under `/organizer/events/:id` (overview, guests, approvals, design, attendance, staff) so they don't each re-resolve it.
  - `ScannerContext` — camera permission, active device, and scan-session state for the check-in screens, shared between the scanner and the result panel. A `useReducer` state machine (idle → scanning → resolving → accepted/duplicate/rejected), because these are ordered transitions rather than independent flags.
  - `PreferencesContext` — theme, table density, and similar persisted UI preferences.
  Each provider is its own file with a `use…()` hook that throws when consumed outside its provider, and each holds a narrow value; a single app-wide "store" context is deliberately avoided, since it would re-render the whole tree on any change — particularly costly on the scanning screen. Providers whose value is an object memoize it.
- **Local state — `useState`.** Forms, modals, gallery lightbox position.

No third-party global state library is used; Query plus Context covers both tiers without one.

### Error Handling & Validation

Zod schemas in `src/lib/validation` mirror the contract's request bodies and back the React Hook Form resolvers, so a payload the server would reject is normally caught before it is sent. They are a UX affordance, not the enforcement layer — RLS, DB triggers, and the Edge Functions are. The `max_party_size` ceiling, for instance, is checked on the form *and* in the database, because the form check protects the guest from a wasted submission while the database check is what actually holds.

The generated client normalizes every failure into the contract's single `Error` shape, so components handle one error type whether it came from PostgREST or an Edge Function. Structural HTML-scan failures come back from `uploadInvitationHtml` as a documented 422 with field-level detail, rendered on the upload form like any other validation error.

### Migration & Naming Conventions

SQL migrations live in `supabase/migrations/`, one logical change per file, named `<timestamp>_<short_description>.sql`. Table and column names use `snake_case`; enums are defined as Postgres enum types where practical.

---

## 10. Non-Functional Requirements

- Designed for typical single-organization event-program scale (dozens of concurrently active events, up to a few thousand guests/attendees per event) absent other guidance.
- **Backup/recovery**: relies on the hosted Supabase project's built-in backup tier; no custom backup pipeline planned for v1.
- **Browser support**: latest two versions of Chrome, Firefox, Safari, and Edge; no legacy browser support required.
- **Image uploads**: reasonable per-file size cap (e.g. 5 MB), JPG/PNG/WebP only, reasonable max image count per gallery.
- **HTML uploads**: reasonable size cap (e.g. 2 MB), exactly one file, must fully pass both validation stages before publishing.
- **Magic links**: single-use, expire on Supabase Auth's default OTP window, rate-limited per email to prevent abuse.
- **Attendance dashboard**: realtime updates should reflect a scan within a few seconds under normal event-day load.

---

## 11. Out of Scope

- Payment processing or paid ticketing.
- A native mobile app (web-responsive only).
- SMS or push-notification channels (email via Resend only).
- A multi-tenant organization hierarchy beyond the single set of org-wide admin settings.
- Recurring or series events — each Event is a standalone, one-off record.
- Seating chart or table-assignment tooling.
- Multi-file HTML invitations with external/bundled assets (e.g. a zip of HTML + images) — v1 requires a single self-contained file.
- Video or animated invitation formats.
- Partial approval of headcount-increase requests (v1 is approve-in-full or reject).

---

## 12. Assumptions & Decisions Log

1. Organizer accounts self-register via Google Sign-In with no organization-domain restriction; manual admin `pending → active` verification is the sole trust gate.
2. System Administrators are provisioned directly, not self-registered, and manage org-wide settings only — no access to any event's guest list, RSVP content, or attendee data.
3. Guest authentication uses real Supabase Auth passwordless email magic links, not a custom signed-link table — giving guests a genuine `auth.uid()` identity and enabling standard RLS.
4. A Guest directory row may exist before its owner ever logs in (organizer-built list or public self-registration); `auth_user_id` is populated lazily on first successful login.
5. Check-in Staff are a lighter-weight, per-event, per-day access role, authenticated via the same magic-link mechanism as Guests but linked through a separate `CheckInAssignment` record, scoped to check-in/attendance screens for one event only.
6. Public open-registration submissions (`/register/:slug`) create or update a Guest and an `accepted` Invitation directly; the confirmation email includes a magic link so the guest can subsequently manage their RSVP through the standard authenticated guest portal.
7. `Invitation.party_size` and `checked_in_count` are cached, trigger-maintained counts of `approved`/checked-in Attendees respectively, not directly guest-entered values.
8. The inviting guest is auto-recorded as an approved, primary Attendee on acceptance; the roster they submit covers only the *additional* party members.
9. Attendee approval is per-attendee, but guest-facing notification is batched: one consolidated email per review cycle, re-sent each time the pending queue newly clears to zero, plus an optional manual mid-review update.
10. Approving an attendee past event capacity is a soft check with an audited override, matching the same pattern used for capacity/waitlist logic elsewhere in the system.
11. QR-bundle dispatch is automatic each time an invitation's roster newly resolves (zero pending attendees), and separately, manually triggerable by the organizer at any time.
12. QR delivery is a single email per invitation to the guest's own address, containing a multi-page PDF covering the whole approved party — not individual emails per attendee.
13. HTML invitation uploads are restricted to a single, fully self-contained file (no external/bundled assets) for v1.
14. Uploaded HTML invitations must pass both a synchronous structural no-external-reference scan and an asynchronous third-party malware scan before being marked usable, and are always rendered guest-side inside a sandboxed, CSP-restricted iframe regardless of scan outcome.
15. Guest access to an invitation is exclusively through authenticated `/guest/*` routes; there is no bare-token access link.
16. Headcount-increase approval is all-or-nothing in v1 (no partial approval).
17. Capacity enforcement is an atomic, database-trigger-enforced check against the event's capacity ceiling; waitlist promotion is strict FIFO and only unblocks the Invitation, it does not auto-approve any attendee.
18. A walk-in creates an ad hoc Attendee row (`is_walk_in = true`), not a flag on the Invitation.
19. Once an event's RSVP deadline passes, invitations lock against further status changes and further attendee-roster/headcount-request edits.
20. Tech stack confirmed: React (Vite SPA), TypeScript, React Router, TanStack Query, React Context for client state, Tailwind CSS + shadcn/ui, Zod, Resend, Supabase (Postgres/RLS/Auth/Storage/Realtime/Edge Functions), Vitest/RTL + Playwright, GitHub Actions, Vercel (static).
21. All project management (Issues, Milestones, PRs, reviews, CI) happens on GitHub — see §13.
22. License: All Rights Reserved, owned by Jomari Joseph A. Barrera, with an explicit contributor-assignment clause for project contributions — see §15 and [LICENSE.md](./LICENSE.md).
23. The Out-of-Scope list (§11) reflects the feature set actually specified in this document; it should be reviewed against any prior scope discussion to confirm nothing else was previously excluded that isn't captured here.
24. **Contract-first backend boundary** — there is no application server; Supabase is the backend, and the frontend/backend interface is `contract/openapi.yaml` (OpenAPI 3.1), documented with Redoc. The frontend may only call operations declared there, and calls through a client generated from it. Realtime and Storage signed-URL access are the two documented exceptions, since neither is HTTP request/response — see §9.
25. **Server-side logic placement** — anything that needs a secret (Resend, VirusTotal, the QR signing key), a privileged write, or a multi-row invariant is a Supabase Edge Function and a documented contract operation; plain reads and single-row writes go directly to PostgREST under RLS — see §9.
26. **Role separation is server-side** — all four audiences (organizer, admin, guest, check-in staff) share one deployed bundle, so route guards are redirect conveniences only; RLS and Edge Function scope checks are what actually separate them.

---

## 13. Project Management & Contributing

This system is built by a cross-functional project team. Everything below assumes developers, QA engineers, product/project management, and other delivery members sharing one repository, and the conventions exist to keep the team from blocking itself.

All project management lives on GitHub: Issues, Milestones, Projects (board), Pull Requests, and reviews. There is no external PM tool.

### Team Structure & Parallel Work

The contract is what makes parallel delivery possible. `contract/openapi.yaml` is written and agreed **first**, before either half is implemented — after that, the frontend team can build every screen against a mock while the backend team implements schema, RLS, and Edge Functions, and neither waits on the other. Integration is then a base-URL change rather than a week of surprises.

A workable delivery split, adapted to the team's size:

| Responsibility | Owns |
|---|---|
| **Contract** | `contract/openapi.yaml` — the operations, schemas, and error responses. Reviewed by both sides before either builds against it |
| **Frontend** | `src/` — routes, components, Context providers, Query hooks, and the generated client wrapper |
| **Backend** | `supabase/` — migrations, RLS policies, Edge Functions |
| **Quality Assurance** | Test strategy, test-case issues, automated end-to-end coverage, and release verification |
| **Project Manager** | Milestones, the issue board, delivery coordination, and the tiebreak on contract disputes |

Two rules keep the split honest:

- **A contract change is a shared decision.** A PR that edits `contract/openapi.yaml` needs approval from someone on the *other* side of it — the frontend cannot quietly add a field it wants, and the backend cannot quietly drop one the UI renders. Ordinary PRs that only consume the contract need the standard single approval.
- **Nobody hand-edits generated output.** `contract/generated/` is regenerated with `npm run contract:gen`; a PR that edits it by hand fails `contract:check` in CI.

Project contributions are documented through commits, pull requests, issue history, test evidence, and review records — see §15.4.

### Test Cases as Issues

End-to-end test cases are raised as GitHub Issues by Quality Assurance in coordination with the Project Manager. Each test-case issue specifies the scenario, steps, and expected result (e.g., "Guest submits a fifth attendee past their max_party_size of 4 — submission should be blocked client- and server-side"). A developer or QA engineer implements the corresponding Playwright test referencing the issue number, and the PR that adds it must close that issue.

### Milestones

Milestones group issues by development phase/sprint (e.g., "Invitation Design & Sandboxing," "Check-in Staff Delegation"). Every issue should be assigned to a milestone before work starts.

### Branching & Pull Requests

- Branch naming: `feature/<short-description>`, `fix/<short-description>`, tied to an issue number where applicable (e.g., `feature/14-html-invitation-sandbox`).
- **Commit messages follow [Conventional Commits](https://www.conventionalcommits.org)**: `type(scope): imperative description`, using `feat`, `fix`, `docs`, `refactor`, `test`, `style`, or `chore`. A change that breaks existing callers takes a `!` before the colon — `feat(contract)!: rename the load endpoint` — which is how a breaking contract change announces itself in the log rather than in someone's failing build.
- Every PR must reference the issue(s) it addresses and describe what changed.
- **1 required reviewer approval** before merging, enforced via GitHub branch protection on `main`.
- CI (see below) must pass before a PR is eligible for merge.

### CI (GitHub Actions)

Workflows in `.github/workflows/` run on every PR:
- Contract lint (`npm run contract:lint`)
- Contract check (`npm run contract:check`) — fails if the committed generated client is stale, or if the live PostgREST schema has drifted from what the contract documents
- Lint (`npm run lint`)
- Typecheck (`npm run typecheck`)
- Unit/component tests (`npm run test`)
- Build (`npm run build`)
- E2E tests (`npm run test:e2e`) against a Supabase instance seeded via `supabase/seed.sql`, run with an authenticated test role (not the service role key) so RLS is actually exercised — including at least one case per role, since role separation is entirely server-side.

The contract jobs run first: a PR that changes schema without updating `contract/openapi.yaml` fails before anything else runs, which is the point of the boundary.

On merge to `main`, a separate deploy workflow applies pending migrations to staging (`supabase db push`), deploys Edge Functions (`supabase functions deploy`), publishes the static Redoc bundle (`npm run contract:docs`) as a build artifact, and then promotes the Vercel deployment.

---

## 14. Deployment

- Frontend is a static bundle (`npm run build`) hosted on Vercel; database, auth, storage, realtime, and Edge Functions live in a hosted Supabase project.
- Vercel needs a catch-all rewrite to `index.html` (`vercel.json`) so React Router can resolve deep links — without it, every emailed link into `/guest/*` 404s. The same `vercel.json` carries the CSP header rules for the invitation-rendering routes (§9).
- GitHub Actions applies `supabase migration up`/`db push` against a staging project, then `supabase functions deploy`, before promoting to production.
- `VITE_`-prefixed variables are configured per-environment in Vercel project settings (Preview/Production). They are compiled into the client bundle and are therefore public by construction. **No secret is ever configured in Vercel** — `RESEND_API_KEY`, `VIRUSTOTAL_API_KEY`, and the QR signing key are set per Supabase environment with `supabase secrets set`.
- Provision the invitation-designs Storage bucket and its storage-level RLS policies (client writes denied — uploads go through `uploadInvitationHtml`) as part of environment setup.
- Configure Supabase Auth's custom SMTP (Resend) and the scanning provider's callback URL at deploy time, not just locally.
- Schedule the `sendReminders` and `promoteWaitlist` functions via `pg_cron` in each environment.
- The static Redoc bundle is published per environment alongside the app, so the deployed contract is always browsable at a stable URL.

---

## 15. License

**Event Invitation and RSVP Management Information System (EIRMIS)**

Copyright © 2026 Jomari Joseph A. Barrera. All rights reserved.

### 14.1 Ownership

This software, including its source code, database schema, documentation, and associated design materials (collectively, the "Work"), is the intellectual property of Jomari Joseph A. Barrera ("the Owner"). The Work is developed under the Owner's direction by the project team. Any code, documentation, designs, test assets, or other materials contributed to the Work are project contributions and are assigned to the Owner as set out in Section 14.3.

### 14.2 Grant of Rights

No rights are granted to any person or entity to use, copy, modify, merge, publish, distribute, sublicense, or sell copies of the Work, in whole or in part, except:

(a) as expressly and separately authorized in writing by the Owner; or
(b) as necessary for an authorized Contributor (as defined in Section 14.3) to perform assigned project work under the Owner's direction.

If this repository or any part of the Work is made visible to the public or to external parties, such access is provided, if at all, for viewing purposes only. No license to reuse, redistribute, or create derivative works is granted by that access.

### 14.3 Contributors

"Contributor" means any developer, QA engineer, designer, project manager, or other authorized project team member who submits code, documentation, test assets, designs, or other materials to the Work.

By contributing, a Contributor:

(a) assigns to the Owner all right, title, and interest in and to their contribution, to the fullest extent permitted by law, or, where such assignment is not legally permitted, grants the Owner a perpetual, irrevocable, worldwide, royalty-free license to use, reproduce, modify, and incorporate the contribution into the Work without restriction;
(b) retains the right to identify their participation in the project for personal portfolio or resume purposes, but may not distribute, publish, or otherwise reuse the Work's source code itself without the Owner's separate written permission;
(c) acknowledges that this assignment is made in connection with project work, without expectation of compensation, royalty, or ongoing rights beyond the attribution described in Section 14.4.

### 14.4 Attribution

The Owner may, at their discretion, credit Contributors for their work. Attribution does not confer any ownership, licensing, or distribution rights on a Contributor.

### 14.5 Relationship to Applicable Agreements

This license states the Owner's claim of ownership and the terms on which the Owner makes the Work available. It does not attempt to override, and remains subject to, any applicable employment, contractor, client, or intellectual-property agreement. Where such an agreement conflicts with this license, that agreement shall govern to the extent required by law.

### 14.6 No Warranty

THE WORK IS PROVIDED "AS IS," WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL THE OWNER BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM THE WORK OR ITS USE.

### 14.7 Governing Law

This license is governed by and construed in accordance with the laws of the Republic of the Philippines.

### 14.8 Contact

For permission requests or licensing inquiries, contact Jomari Joseph A. Barrera.

### 14.9 Data Privacy Notice

This system processes personal information about guests and attendees — including names, email addresses, dietary preferences, and check-in records — as part of its core function. Its handling of that data should be reviewed against the Philippines' Data Privacy Act of 2012 (RA 10173) and any applicable organizational data-privacy policy before any deployment involving real guest data. This document does not constitute legal advice; independent legal/compliance review is recommended.

*This is not legal advice. Independent legal review is recommended, particularly regarding how this license interacts with applicable intellectual-property agreements and data privacy law.*

---

## 16. Glossary

| Term | Meaning |
|---|---|
| **Event** | An organizer-owned record with a capacity ceiling, RSVP deadline, visibility mode, and status lifecycle. |
| **Guest** | The cross-event directory identity that logs in via magic link; distinct from `Attendee`. |
| **Attendee** | One person within an invitation's party; the guest themself plus every additional name they submit. |
| **Primary Attendee** | The auto-created, auto-approved Attendee record representing the inviting guest. |
| **Magic Link** | A single-use, expiring, passwordless login link emailed via Supabase Auth, used by both Guests and Check-in Staff. |
| **Headcount Increase Request** | A guest's request to raise their invitation's `max_party_size` beyond what was originally offered. |
| **Invitation Design** | An event's creative asset for the invitation view: either an image gallery or a single validated, sandboxed HTML file. |
| **Approval Queue** | The organizer-facing screen listing pending Attendees and pending Headcount Increase Requests awaiting a decision. |
| **QR Bundle** | The multi-page PDF containing one QR code per approved Attendee in a party, emailed as a single file. |
| **Sandboxed Rendering** | Serving an uploaded HTML invitation inside an iframe with restricted permissions and a strict Content-Security-Policy, independent of upload-time scanning. |
| **Check-in Staff** | An organizer-designated helper with scanning-only access to one event for the event day, via a `CheckInAssignment`. |
| **Check-in Assignment** | The record delegating check-in access for one event to one Check-in Staff member, including its own auth linkage. |
| **Waitlist** | The strict-FIFO holding state for invitations that would otherwise exceed event capacity. |
| **Walk-in** | An Attendee record created on the event day with no prior roster entry. |
| **Visibility Mode** | Whether an event is `open_registration` (public, self-service) or `invite_only` (organizer-built guest list only). |

---

## 17. Open Questions & Risks

1. **Malware-scan provider & latency**: which scanning service, and what's an acceptable turnaround for `validation_status` to resolve from `pending`? This affects how long an organizer waits before an HTML design can go live.
2. **HTML validation false positives**: if a legitimate, harmless file is incorrectly flagged, what's the organizer's recourse beyond "edit and re-upload"? Is a manual admin override warranted?
3. **Individually-addressed attendees**: attendees who do have their own email currently do *not* get their own QR email (only the guest's consolidated PDF, per Decision #12) — confirm this is acceptable, or whether a secondary individual send should be added later.
4. **Partial headcount approval**: is approve-in-full-or-reject (Decision #16, §11) sufficient, or will organizers want to counter-offer a smaller number than requested?
5. **QR re-use at re-entry**: should a scanned QR be single-use (blocks re-scan) or freely re-scannable (for events with re-entry, e.g. a lunch break)? Not yet decided.
6. **Attendance dashboard at scale**: realtime-subscription behavior for very large, high-velocity check-in windows (e.g. thousands of guests scanning within a few minutes) hasn't been load-tested against Supabase Realtime's practical limits.
7. **Check-in Staff authentication design** (§6, §9): confirm the magic-link-plus-`CheckInAssignment` approach matches the intended UX, versus a simpler shared PIN/access-code model for event-day-only staff who may not want to check email at the door.
8. **Open-registration → Guest/Invitation flow** (§6, Decision #6): confirm that a public open-registration submission should auto-accept directly, rather than requiring organizer review before the invitation itself is confirmed (attendee-roster review already happens downstream regardless).
9. **Tentative RSVP status**: `Invitation.status = tentative` is defined as non-committing and non-capacity-reserving, but whether it should have its own reminder/notification behavior distinct from `pending` hasn't been decided.
10. **Reconstructed Out-of-Scope list** (§11): this list reflects the feature set actually specified elsewhere in this document; confirm no other exclusions existed in prior scope discussions that should be captured here.
11. **PostgREST drift-check strictness** (§9) — the CI comparison between `contract/openapi.yaml` and the live auto-generated PostgREST description needs a decided policy on additive changes: a new column is harmless to the frontend but is still drift. Confirm whether the check fails on any difference or only on ones affecting documented operations.
12. **Contract review in a small group** (§13) — the both-sides-approval rule for contract changes assumes the group is large enough that the frontend and backend halves are different people. Confirm how it degrades for a two-person group, where one member may own both sides and the rule becomes self-approval.
13. **CSP as deployment configuration** (§9, §14) — the invitation-sandboxing CSP now lives in `vercel.json` rather than in application code, so it is not covered by the test suite. Confirm how a CSP regression would be caught before it reaches production.

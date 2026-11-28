# EIRMIS — Web App Deployment Setup Checklist

This checklist covers everything required to deploy the **Event Invitation and RSVP Management Information System (EIRMIS)** to staging or production.

The architecture consists of two parts:
- **Backend**: Hosted **Supabase** project (PostgreSQL 17, Auth, Storage, Realtime, Edge Functions, and `pg_cron`/`pg_net` scheduled jobs).
- **Frontend**: Static Vite/React SPA (`dist/`) hosted on **Vercel** (or any static SPA host).

For deeper Supabase-specific SQL and configuration details, see [supabase-configuration-guide.md](./supabase-configuration-guide.md) and [reminders-todo.md](./reminders-todo.md).

## M5 Execution Waves & Issue Mapping

Not all M5 issues can run in parallel. Execute in four waves after merging PR `#207` (`feat/m4-frontend` → `develop`):

| Wave | Issues (Parallel within wave) | Owners | Checklist Sections Covered |
|---|---|---|---|
| **Wave 0 (Prereq)** | Merge PR `#207` (`feat/m4-frontend` → `develop`) | Team | Shared integration base |
| **Wave 1 (Parallel)** | `#212` (Live Supabase wiring), `#214` (Playwright + local Supabase CI), `#219` Part A (Staging infra + `vercel.json` + `invitation-designs` migration) | `AndreiKahano` (`#212`), `NoSeeReally` (`#214`), `BigDrems` (`#219`) | §1 (core accounts), §2.1–§2.5 (core secrets & `dispatch-event-reminders` cron), §2.6, §3, §4 (`vercel.json`) |
| **Wave 2 (Parallel)** | `#213` (Realtime + Storage signed URLs), `#215` & `#216` (Organizer/Admin E2E), `#217` & `#218` (Guest/Check-in Staff E2E), `#219` Part B (Final staging deploy + CSP check) | `BigDrems` (`#213`, `#219`), `bluebirbb` (`#215`, `#216`), `Cormz12-26` (`#217`, `#218`) | §2.3, §2.6, §3, §4 (`vercel.json` CSP verification) |
| **Wave 3 (Sequential / Stretch)** | `#220` (Live staging 4-role QA & final smoke test), `#221` *(Stretch: HTML Invitation Design upload & VirusTotal Scan Job)* | `BigDrems` + `NoSeeReally` (`#220`), `AndreiKahano` (`#221`) | End-to-end staging sign-off (`#220`); §1 & §2.4 scanner secrets (`#221`) |

---

## 1. External Accounts & Services

- [ ] **Supabase**: Create a remote project (Postgres 17) for each environment (staging / production) and authenticate locally with `supabase login`. *(`#219`)*
- [ ] **Vercel** (or static host): Create a project connected to this repository. *(`#219`)*
- [ ] **Google Cloud Console**: Create OAuth 2.0 Client credentials (**OAuth Consent Screen → External**) for Organizer and Admin sign-in. *(`#219`)*
- [ ] **Resend**: Create an API key and verify a custom sending domain for transactional emails and Supabase Auth SMTP. *(`#219`)*
- [ ] *(Stretch — `#221`, does not block M5 main-flow sign-off)* **Malware Scanner (e.g., VirusTotal / external scanner)**: Obtain API key, submit endpoint, and webhook signing secret for scanning uploaded **HTML Invitation Designs**.

---

## 2. Supabase Backend Setup

### 2.1 Database Migrations, Extensions & Initial Admin

- [ ] Link your local CLI to the target remote project:
  ```bash
  supabase link --project-ref <PROJECT-REF>
  ```
- [ ] Push all database migrations:
  ```bash
  supabase db push
  ```
- [ ] Verify required PostgreSQL extensions are enabled:
  ```sql
  create extension if not exists pgcrypto with schema extensions;
  create extension if not exists uuid-ossp with schema extensions;
  create extension if not exists pg_cron with schema extensions;
  create extension if not exists pg_net with schema extensions;
  ```
- [ ] Provision the initial **Admin** user (after signing up the user once):
  ```sql
  update auth.users
  set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
  where id = '<USER_UUID>';

  insert into public.admin_profiles (id, email, full_name)
  select id, email, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
  from auth.users
  where id = '<USER_UUID>'
  on conflict (id) do nothing;
  ```
- [ ] **Do not** run `supabase/seed.sql` in production.

### 2.2 Authentication (`Supabase Dashboard → Authentication`)

- [ ] **Google OAuth (`Providers → Google`)**:
  - Enable Google provider and enter the Google Cloud **Client ID** and **Client Secret**.
  - In Google Cloud Console, add `https://<PROJECT-REF>.supabase.co/auth/v1/callback` to **Authorized Redirect URIs**.
- [ ] **Email / Passwordless (`Providers → Email`)**:
  - Enable Email provider and enable signups (used for Guest and Check-in Staff magic-link/OTP login).
- [ ] **Custom SMTP (`SMTP Settings` via Resend)**:
  - Enable Custom SMTP to avoid default Supabase email rate limits.
  - Host: `smtp.resend.com` | Port: `465` (SSL) or `587` (TLS) | Username: `resend` | Password: `<RESEND_API_KEY>`.
  - Sender email: verified Resend domain (e.g., `EIRMIS <noreply@your-verified-domain.com>`).
- [ ] **URL Configuration (`URL Configuration`)**:
  - **Site URL**: `https://your-production-domain.com`
  - **Redirect URLs (Allowlist)**: `https://your-production-domain.com/**` *(wildcard required so emailed deep links like `/guest/*` and `/staff/*` resolve)*.

### 2.3 Storage Buckets

- [ ] Confirm `invitation-html` bucket exists (private, 2 MB limit, `text/html`) — provisioned by migration `20261112000000_html_scan_upload.sql`.
- [ ] Commit a SQL migration *(`#219` Part A)* to provision the `invitation-designs` bucket (public read, 5 MB limit, `image/jpeg`, `image/png`, `image/webp`) and its storage RLS policies so local Supabase (`supabase db reset` in CI/E2E) and staging stay in sync:
  ```sql
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'invitation-designs',
    'invitation-designs',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
  on conflict (id) do nothing;
  ```

### 2.4 Edge Functions & Secrets

- [ ] Deploy all 10 Edge Functions:
  - `attendees`, `checkin`, `headcount-requests`, `html-scan-callback`, `invitation-html`, `qr-bundle`, `register-public`, `reminders`, `submit-headcount-request`, `waitlist`
  ```bash
  supabase functions deploy
  ```
- [ ] Verify JWT verification is disabled (`verify_jwt = false`) for public/webhook functions (defined in `supabase/config.toml`):
  - `register-public` (unauthenticated open-registration RSVP)
  - `html-scan-callback` (authenticated via HMAC webhook signature)
- [ ] Configure **core main-flow Edge Function secrets** *(`#219`)* via `supabase secrets set` (never place these in Vercel or `.env.local`):
  ```bash
  # Transactional Email (Resend)
  supabase secrets set RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxx"
  supabase secrets set RESEND_FROM_EMAIL="EIRMIS <tickets@your-verified-domain.com>"

  # Web App Base URL (for links in emails)
  supabase secrets set APP_URL="https://your-production-domain.com"

  # QR Code HMAC-SHA256 Signing Secret (32-byte hex; fails closed if missing)
  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  supabase secrets set QR_SIGNING_SECRET="<32-byte-hex-secret>"

  # Optional Storage Bucket Override (defaults to invitation-designs)
  supabase secrets set STORAGE_BUCKET_DESIGNS="invitation-designs"
  ```
- [ ] *(Stretch — `#221`, does not block `#219` or `#220`)* Configure **HTML Invitation Design Malware Scanner & Webhook secrets**:
  ```bash
  supabase secrets set SCANNER_WEBHOOK_SECRET="<random-webhook-secret>"
  supabase secrets set SCANNER_SUBMIT_URL="<scanner-submit-endpoint>"
  supabase secrets set SCANNER_API_KEY="<scanner-api-key>"
  supabase secrets set SCANNER_CALLBACK_URL="https://<PROJECT-REF>.supabase.co/functions/v1/html-scan-callback"
  supabase secrets set VIRUSTOTAL_API_KEY="<virustotal-api-key>"
  ```
  > **Note:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase — do not set them manually.
- [ ] Confirm secrets are set with `supabase secrets list`.

### 2.5 Scheduled Cron Jobs (`pg_cron` & `pg_net`)

- [ ] Register the **Reminders Dispatch** cron job (every 15 minutes) *(`#219`, verified in `#220`)*:
  ```sql
  select cron.schedule(
    'dispatch-event-reminders',
    '*/15 * * * *',
    $$
    select
      net.http_post(
        url := 'https://<PROJECT-REF>.supabase.co/functions/v1/reminders/dispatch',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      ) as request_id;
    $$
  );
  ```
- [ ] *(Optional — skipped for M5; **Waitlist Promotion** is already triggered on capacity release / organizer action)* Register the **Waitlist Promotion** periodic check (hourly):
  ```sql
  select cron.schedule(
    'promote-waitlist-hourly',
    '0 * * * *',
    $$
    select
      net.http_post(
        url := 'https://<PROJECT-REF>.supabase.co/functions/v1/waitlist/promote',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      ) as request_id;
    $$
  );
  ```
- [ ] Verify active jobs:
  ```sql
  select jobid, jobname, schedule, active from cron.job;
  ```

### 2.6 Realtime

- [ ] Confirm **Realtime** is enabled in Supabase so live check-in broadcasts (`attendance:<event_id>`) work on the check-in and attendance dashboards.

---

## 3. Frontend Hosting Setup (Vercel)

- [ ] **Node.js Version**: Configure Node `>=22.13.0` (Node 22 LTS, matching `.nvmrc` and `package.json`).
- [ ] **Build Settings**:
  - Build command: `npm run build`
  - Output directory: `dist`
- [ ] **Environment Variables** (Preview / Production in Vercel Project Settings):
  - `VITE_SUPABASE_URL` = `https://<PROJECT-REF>.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` = `<Supabase Publishable Key>` *(and/or `VITE_SUPABASE_ANON_KEY`)*
  - `VITE_SITE_URL` = `https://your-production-domain.com`
  - `VITE_STORAGE_BUCKET_DESIGNS` = `invitation-designs`
  - *(Optional)* `VITE_API_URL` — omit to default to `VITE_SUPABASE_URL`.
  - ⚠️ **Never put secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `QR_SIGNING_SECRET`, `VIRUSTOTAL_API_KEY`) in Vercel; all `VITE_*` variables are bundled into public client JavaScript.

---

## 4. Pre-Deploy Repository Gaps to Address

Before the first production deployment, add the following files that are referenced in `README.md` but not yet committed to the repo:

- [ ] **`vercel.json`** *(`#219`)*:
  - Add a catch-all rewrite to `/index.html` so React Router resolves direct/emailed deep links (e.g., `/guest/*`, `/staff/*`) without returning 404.
  - Add Content Security Policy (CSP) headers for the invitation-rendering routes.
- [ ] *(Post-M5 / Deferred)* **CD GitHub Actions Workflow (`.github/workflows/deploy.yml`)**:
  - Deferred out of M5 — use Supabase CLI (`supabase db push`, `supabase functions deploy`) + Vercel Git integration for M5 staging. Add a deploy workflow on merge to `main` post-M5 if automated DB/Edge Function/Redoc promotion is needed.

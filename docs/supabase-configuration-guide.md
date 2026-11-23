# EIRMIS — Supabase Configuration Guide

This guide details all configuration required in Supabase to run, test, and deploy the **Event Invitation and RSVP Management Information System (EIRMIS)** across local development, staging, and production environments.

---

## Table of Contents

1. [Prerequisites & Overview](#1-prerequisites--overview)
2. [Database & Migrations](#2-database--migrations)
3. [Authentication (`auth`)](#3-authentication-auth)
4. [Storage Buckets (`storage`)](#4-storage-buckets-storage)
5. [Edge Functions & Secrets](#5-edge-functions--secrets)
6. [Scheduled Automation (`pg_cron` & `pg_net`)](#6-scheduled-automation-pg_cron--pg_net)
7. [Realtime Broadcast](#7-realtime-broadcast)
8. [Client Environment Configuration (`.env.local`)](#8-client-environment-configuration-envlocal)

---

## 1. Prerequisites & Overview

- **Supabase CLI**: installed and authenticated (`supabase login`).
- **Docker**: running (for local development via `supabase start`).
- **External Accounts**:
  - **Google Cloud Console**: OAuth 2.0 Client credentials (used for Organizer & Admin login).
  - **Resend**: API key and verified sending domain (used for transactional emails and Auth SMTP).
  - **Malware Scanner (e.g. VirusTotal)**: API key for HTML invitation validation.

---

## 2. Database & Migrations

### 2.1 Apply Migrations

Run all database migrations from the repository root:

```bash
# Local development
supabase migration up

# Or push to a linked remote project
supabase db push
```

These migrations provision:
- Core enums and domain tables (`events`, `guests`, `invitations`, `attendees`, `invitation_designs`, `audit_log_entries`, etc.).
- Triggers and constraints:
  - `handle_new_user()` auth linkage trigger.
  - Headcount increase approval & attendee roster limits.
  - Primary attendee protection & prevention of duplicate primary attendees.
  - Atomic check-in function with Realtime broadcast.
- Helper functions to prevent recursive RLS evaluations (`is_admin`, `is_event_organizer`).

### 2.2 Postgres Extensions

Ensure the following Postgres extensions are enabled:

```sql
create extension if not exists pgcrypto with schema extensions;
create extension if not exists uuid-ossp with schema extensions;
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
```

### 2.3 Initial Administrator Provisioning

The `public.handle_new_user()` trigger automatically provisions `admin_profiles` when `NEW.raw_app_meta_data->>'role' = 'admin'`.

To grant an initial user Administrator privileges:

```sql
-- Replace <USER_UUID> with the auth.users ID of the administrator
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
where id = '<USER_UUID>';

-- Then ensure the admin_profiles row exists:
insert into public.admin_profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
from auth.users
where id = '<USER_UUID>'
on conflict (id) do nothing;
```

### 2.4 Seed Data (Local Development Only)

Populate synthetic test data to exercise all UI flows:

```bash
supabase db seed
```

---

## 3. Authentication (`auth`)

Configure authentication in the **Supabase Dashboard → Authentication**:

### 3.1 Google OAuth Provider (Organizer & Admin)

- **Navigation**: **Authentication → Providers → Google**
- **Settings**:
  - **Enable Google provider**: ON
  - **Client ID**: From Google Cloud Console
  - **Client Secret**: From Google Cloud Console
- **Google Cloud Console Configuration**:
  - **OAuth Consent Screen**: Set user type to **External** (no Google Workspace domain restriction so organizers can use any personal or business Google account).
  - **Authorized Redirect URIs**:
    - Local: `http://127.0.0.1:54321/auth/v1/callback`
    - Remote: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`

### 3.2 Email Provider (Guest & Check-in Staff)

- **Navigation**: **Authentication → Providers → Email**
- **Settings**:
  - **Enable Email provider**: ON
  - **Enable Signups**: ON (`enable_signup = true`)
  - **Passwordless Sign-in (Email OTP / Magic Link)**: Enabled (Guests and Staff authenticate without passwords).

### 3.3 Custom SMTP Settings (Resend)

To prevent rate-limiting and ensure all auth emails (magic links) come from the same branded domain as event transactional emails:

- **Navigation**: **Authentication → SMTP Settings**
- **Settings**:
  - **Enable Custom SMTP**: ON
  - **Sender Email**: `EIRMIS <noreply@your-verified-domain.com>`
  - **Sender Name**: `EIRMIS`
  - **Host**: `smtp.resend.com`
  - **Port**: `465` (SSL) or `587` (TLS)
  - **Username**: `resend`
  - **Password**: `<YOUR_RESEND_API_KEY>`

### 3.4 URL Configuration & Redirect Allowlist

- **Navigation**: **Authentication → URL Configuration**
- **Site URL**:
  - Local: `http://localhost:5173`
  - Production: `https://your-domain.com`
- **Redirect URLs (Allowlist)**:
  - `http://localhost:5173/**`
  - `https://your-domain.com/**`
  *(Wildcard matching is necessary so deep-link redirects for `/guest/login`, `/guest/dashboard`, `/staff/login`, etc. resolve properly).*

---

## 4. Storage Buckets (`storage`)

EIRMIS utilizes two storage buckets:

### 4.1 `invitation-html`

- **Purpose**: Stores single-file HTML interactive invitations uploaded by organizers.
- **Created by**: Migration `20261112000000_html_scan_upload.sql`.
- **Visibility**: **Private** (`public = false`).
- **File size limit**: `2097152` bytes (2 MB).
- **Allowed MIME types**: `['text/html']`.
- **Security**: Direct client uploads are blocked by RLS. Files can only be written through the `invitation-html` Edge Function using the Supabase Service Role key.

### 4.2 `invitation-designs`

- **Purpose**: Stores gallery mode invitation images (JPEG, PNG, WebP).
- **Visibility**: **Public** (or public read access for invited guests/organizers).
- **File size limit**: `5242880` bytes (5 MB).
- **Allowed MIME types**: `['image/jpeg', 'image/png', 'image/webp']`.
- **Setup SQL**:

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

---

## 5. Edge Functions & Secrets

### 5.1 Deployment

Deploy the project's Edge Functions:

```bash
supabase functions deploy attendees
supabase functions deploy checkin
supabase functions deploy headcount-requests
supabase functions deploy html-scan-callback
supabase functions deploy invitation-html
supabase functions deploy qr-bundle
supabase functions deploy register-public
supabase functions deploy reminders
supabase functions deploy submit-headcount-request
supabase functions deploy waitlist
```

### 5.2 Edge Function Secrets

Configure environment secrets in the Supabase Dashboard (**Project Settings → Edge Functions**) or via the CLI:

```bash
# Email Delivery
supabase secrets set RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxx"
supabase secrets set RESEND_FROM_EMAIL="EIRMIS <tickets@your-verified-domain.com>"

# QR Code Signing (HMAC-SHA256 signature)
supabase secrets set QR_SIGNING_SECRET="your-secure-random-signing-secret"

# Web App Base URL (used to generate email links)
supabase secrets set APP_URL="https://your-domain.com"

# Invitation Malware Scanner
supabase secrets set VIRUSTOTAL_API_KEY="your-virustotal-api-key"
supabase secrets set SCANNER_WEBHOOK_SECRET="your-scanner-webhook-secret"

# Storage Bucket Names (optional overrides)
supabase secrets set STORAGE_BUCKET_DESIGNS="invitation-designs"
```

> **Note**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected by the Supabase platform runtime.

### 5.3 Function JWT Verification Settings

In `supabase/config.toml` (and in project Edge Function settings):

- **`register-public`**: `verify_jwt = false` — Public unauthenticated guests must be able to submit open-registration RSVPs without a JWT.
- **`html-scan-callback`**: `verify_jwt = false` — External file-scanning webhooks do not carry Supabase user JWTs and are authenticated via payload HMAC signatures.

---

## 6. Scheduled Automation (`pg_cron` & `pg_net`)

Automated tasks (event reminders and waitlist promotions) run periodically using `pg_cron` and `pg_net`.

### 6.1 Register Reminder Dispatch Cron Job

Run this SQL snippet in the Supabase SQL Editor:

```sql
-- Ensure extensions are active
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Schedule reminder dispatcher to run every 15 minutes
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

### 6.2 Register Waitlist Promotion Cron Job (Optional Periodic Check)

```sql
-- Schedule waitlist promoter to run hourly
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

### 6.3 Verify Scheduled Jobs

```sql
select jobid, jobname, schedule, active from cron.job;
```

---

## 7. Realtime Broadcast

- **Attendance Channel**: `broadcast:attendance:<event_id>`
- The check-in screen and attendance dashboard subscribe to realtime attendance updates.
- In `20261110000000_atomic_checkin.sql`, the `atomic_checkin` function emits broadcast messages via `realtime.send(...)` into the `attendance:<event_id>` topic.
- Ensure **Realtime** is enabled in your Supabase project under **Database → Replication** / **Project Settings → API**.

---

## 8. Client Environment Configuration (`.env.local`)

On the client side, populate `.env.local` with values from your Supabase Project Settings:

```ini
# Supabase Client Settings (Safe to expose to browser)
VITE_SUPABASE_URL=https://<PROJECT-REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<PROJECT_ANON_KEY>
VITE_SUPABASE_PUBLISHABLE_KEY=<PROJECT_PUBLISHABLE_KEY>

# Frontend URL
VITE_SITE_URL=http://localhost:5173

# Storage Bucket
VITE_STORAGE_BUCKET_DESIGNS=invitation-designs
```

> ⚠️ **Warning**: Never place secret keys (such as `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY`) in `.env.local`. All `VITE_` variables are compiled into the client bundle and are public.


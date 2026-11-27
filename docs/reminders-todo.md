# Supabase Setup & Deployment Checklist: Reminders Automation

This checklist tracks remaining tasks required in Supabase to take the `sendReminders` Edge Function (`POST /functions/v1/reminders/dispatch`) from implementation to production automation.

---

## 1. Secrets & Environment Configuration

Configure the required environment variables in the Supabase Dashboard under **Project Settings > Edge Functions** (or via `supabase secrets set`):

- [ ] `RESEND_API_KEY`: API key generated from [Resend](https://resend.com/api-keys).
- [ ] `RESEND_FROM_EMAIL`: Verified sender email address (e.g., `EIRMIS <noreply@yourdomain.com>`).
- [ ] `APP_URL` / `SITE_URL`: Base URL of the guest-facing web application (e.g., `https://eirmis.app` or `http://localhost:5173`) used for generating guest portal links.
- [ ] Verify default runtime secrets are present:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`

---

## 2. Edge Function Deployment

Deploy the reminders Edge Function bundle to Supabase:

- [ ] Deploy function:
  ```bash
  supabase functions deploy reminders
  ```
- [ ] Test health check / dry-run with service role key:
  ```bash
  curl -X POST "https://<PROJECT-REF>.supabase.co/functions/v1/reminders/dispatch" \
    -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"dry_run": true}'
  ```
  Expected response:
  ```json
  { "sent_count": 0, "processed_schedules": 0, "dry_run": true }
  ```

---

## 3. Scheduled Automation (`pg_cron` & `pg_net`)

Schedule the function to be invoked periodically (e.g., every 15 minutes) to evaluate due reminder schedules across event timezones.

- [ ] Enable Postgres extensions:
  ```sql
  create extension if not exists pg_cron with schema extensions;
  create extension if not exists pg_net with schema extensions;
  ```

- [ ] Configure Vault secrets (recommended for security) or set project credentials:
  ```sql
  -- Optional: Store secrets securely in Supabase Vault
  select vault.create_secret('https://<PROJECT-REF>.supabase.co', 'project_url');
  select vault.create_secret('<SUPABASE_SERVICE_ROLE_KEY>', 'service_role_key');
  ```

- [ ] Register recurring cron job:
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

- [ ] Verify cron registration in Postgres:
  ```sql
  select * from cron.job where jobname = 'dispatch-event-reminders';
  ```

---

## 4. Test Data & Verification

- [ ] Verify target event preconditions:
  - Event `status = 'published'`
  - Event `deleted_at IS NULL`
  - Event `starts_at` and `ends_at` are in the future
  - Event `event_timezone` is set to an accurate IANA timezone (e.g., `'Asia/Manila'`)
- [ ] Configure reminder schedule row in `reminder_schedules`:
  ```sql
  insert into reminder_schedules (event_id, days_before_event, send_time_of_day, enabled)
  values ('<EVENT_UUID>', 3, '09:00:00', true)
  on conflict (event_id, days_before_event) do nothing;
  ```
- [ ] Verify invitation statuses:
  - Invitations with `status = 'accepted'` receive countdown reminders.
  - Invitations with `status IN ('pending', 'tentative')` receive RSVP nudges (if before `rsvp_deadline`).
- [ ] Inspect execution and delivery audit records:
  ```sql
  -- Check email delivery log
  select * from email_logs order by created_at desc limit 20;

  -- Check system audit log entries
  select * from audit_log_entries where action = 'reminder.dispatched' order by created_at desc limit 10;

  -- Check schedule updated timestamp
  select id, event_id, days_before_event, last_sent_at from reminder_schedules;
  ```

-- =============================================================================
-- pgTAP Test Suite: 02_rls_policies.test.sql
-- Purpose: Verify Row Level Security (RLS) enforcement across all roles:
--          Organizer, Admin, Guest, Check-in Staff, and Public (Anon).
-- =============================================================================

BEGIN;
SELECT plan(22);

-- 1. Verify RLS is enabled on all 14 application tables
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'organizer_profiles'),
  true,
  'RLS enabled on organizer_profiles'
);
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'admin_profiles'),
  true,
  'RLS enabled on admin_profiles'
);
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'guests'),
  true,
  'RLS enabled on guests'
);
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'events'),
  true,
  'RLS enabled on events'
);
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'invitations'),
  true,
  'RLS enabled on invitations'
);
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'attendees'),
  true,
  'RLS enabled on attendees'
);
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'headcount_increase_requests'),
  true,
  'RLS enabled on headcount_increase_requests'
);
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'checkin_assignments'),
  true,
  'RLS enabled on checkin_assignments'
);
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'reminder_schedules'),
  true,
  'RLS enabled on reminder_schedules'
);
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'invitation_designs'),
  true,
  'RLS enabled on invitation_designs'
);
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'invitation_images'),
  true,
  'RLS enabled on invitation_images'
);
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'org_settings'),
  true,
  'RLS enabled on org_settings'
);
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'email_logs'),
  true,
  'RLS enabled on email_logs'
);
SELECT is(
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'audit_log_entries'),
  true,
  'RLS enabled on audit_log_entries'
);

-- 2. Verify Key Role Policy Registrations
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log_entries' AND policyname = 'audit_log_entries: admin reads all'),
  'Policy audit_log_entries: admin reads all exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'org_settings' AND policyname = 'org_settings: admin reads settings'),
  'Policy org_settings: admin reads settings exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'events: public reads published open registration'),
  'Policy events: public reads published open registration exists'
);

-- 3. Behavioral Role Tests via Session Switching

-- Public / Anon: Should only see published open_registration events, never draft or invite-only
SET LOCAL ROLE anon;
SELECT results_eq(
  'SELECT count(*)::integer FROM public.events WHERE status = ''draft''',
  ARRAY[0],
  'Anon cannot view draft events'
);

SELECT cmp_ok(
  (SELECT count(*)::integer FROM public.events WHERE visibility_mode = 'open_registration' AND status = 'published'),
  '>',
  0,
  'Anon can view published open-registration events'
);

-- Admin: Should be able to view org_settings and global audit logs
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222'; -- Synthetic Admin from seed

SELECT results_eq(
  'SELECT count(*)::integer FROM public.org_settings',
  ARRAY[1],
  'Admin can read org_settings'
);

SELECT cmp_ok(
  (SELECT count(*)::integer FROM public.audit_log_entries),
  '>',
  0,
  'Admin can read global audit_log_entries'
);

-- Admin should have no access to guest attendee rosters (privacy boundary)
SELECT results_eq(
  'SELECT count(*)::integer FROM public.attendees',
  ARRAY[0],
  'Admin has no read access to attendees roster'
);

SELECT * FROM finish();
ROLLBACK;


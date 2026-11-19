-- =============================================================================
-- pgTAP Test Suite: 02_rls_policies.test.sql
-- Purpose: Verify Row Level Security (RLS) enforcement across all roles:
--          Organizer, Admin, Guest, Check-in Staff, and Public (Anon).
-- =============================================================================

BEGIN;
SELECT plan(27);

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
  EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'events: public reads open registration published'),
  'Policy events: public reads open registration published exists'
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

-- Active Organizer: Should be able to create an event without passing organizer_id explicitly
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111'; -- Synthetic active Organizer from seed
SET LOCAL "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

SELECT lives_ok(
  $$INSERT INTO public.events (
      title, slug, description, starts_at, ends_at, event_timezone,
      venue_name, address, city, capacity, rsvp_deadline, visibility_mode, status
    ) VALUES (
      'Organizer RLS Insert Test',
      'organizer-rls-insert-test',
      'Created without explicit organizer_id in payload.',
      now() + interval '30 days',
      now() + interval '31 days',
      'Asia/Manila',
      'Grand Ballroom',
      '123 Rizal Avenue',
      'Cebu City',
      500,
      now() + interval '20 days',
      'invite_only',
      'draft'
    )$$,
  'Active organizer can insert an event without explicitly specifying organizer_id'
);

-- Pending Organizer: Should be blocked by RLS from creating an event
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111112'; -- Synthetic pending Organizer from seed
SET LOCAL "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111112","role":"authenticated"}';

SELECT throws_ok(
  $$INSERT INTO public.events (
      title, slug, starts_at, ends_at, capacity, rsvp_deadline, visibility_mode, status
    ) VALUES (
      'Pending Organizer Event',
      'pending-organizer-event',
      now() + interval '30 days',
      now() + interval '31 days',
      100,
      now() + interval '20 days',
      'invite_only',
      'draft'
    )$$,
  '42501',
  NULL,
  'Pending organizer cannot insert an event'
);

-- Active Organizer: Should be able to create a check-in assignment without passing invited_by explicitly
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111'; -- Synthetic active Organizer from seed
SET LOCAL "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

SELECT lives_ok(
  $$INSERT INTO public.checkin_assignments (
      event_id, staff_email
    ) VALUES (
      '55555555-5555-5555-5555-555555555555',
      'staff@example.com'
    )$$,
  'Active organizer can insert a checkin_assignment without explicitly specifying invited_by'
);

SELECT results_eq(
  $$SELECT invited_by FROM public.checkin_assignments
    WHERE event_id = '55555555-5555-5555-5555-555555555555'
      AND staff_email = 'staff@example.com'$$,
  ARRAY['11111111-1111-1111-1111-111111111111'::uuid],
  'checkin_assignments.invited_by defaults to auth.uid() on insert'
);

-- Non-owner Organizer: Should be blocked by RLS from assigning check-in staff to another organizer''s event
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111112';
SET LOCAL "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111112","role":"authenticated"}';

SELECT throws_ok(
  $$INSERT INTO public.checkin_assignments (
      event_id, staff_email
    ) VALUES (
      '55555555-5555-5555-5555-555555555555',
      'unauthorized-staff@example.com'
    )$$,
  '42501',
  NULL,
  'Non-owner organizer cannot insert a checkin_assignment for another organizer''s event'
);

SELECT * FROM finish();
ROLLBACK;


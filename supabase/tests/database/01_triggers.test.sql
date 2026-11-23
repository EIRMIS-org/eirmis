-- =============================================================================
-- pgTAP Test Suite: 01_triggers.test.sql
-- Purpose: Verify auth linkage triggers, updated_at triggers, and business logic triggers.
-- =============================================================================

BEGIN;
SELECT plan(11);

-- 1. Trigger Existence Checks
SELECT has_trigger('auth', 'users', 'trg_on_auth_user_created', 'auth.users has linkage trigger');
SELECT has_trigger('public', 'organizer_profiles', 'trg_organizer_profiles_updated_at', 'organizer_profiles has updated_at trigger');
SELECT has_trigger('public', 'events', 'trg_events_updated_at', 'events has updated_at trigger');
SELECT has_trigger('public', 'invitations', 'trg_invitations_updated_at', 'invitations has updated_at trigger');
SELECT has_trigger('public', 'guests', 'trg_guests_updated_at', 'guests has updated_at trigger');
SELECT has_trigger('public', 'org_settings', 'trg_org_settings_updated_at', 'org_settings has updated_at trigger');
SELECT has_trigger('public', 'attendees', 'trg_attendee_insert_enforce_rsvp_deadline', 'attendees enforces rsvp deadline on insert');
SELECT has_trigger('public', 'headcount_increase_requests', 'trg_hir_insert_enforce_rsvp_deadline', 'hir enforces rsvp deadline on insert');

-- 2. Functional Test: handle_new_user() provisions admin_profile via raw_app_meta_data
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '99999999-9999-9999-9999-999999999991', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'test_admin_trigger@example.com', 'dummy_hash', now(),
  '{"provider":"email","role":"admin"}', '{"full_name":"Trigger Admin"}', now(), now()
);

SELECT results_eq(
  'SELECT email FROM public.admin_profiles WHERE id = ''99999999-9999-9999-9999-999999999991''',
  ARRAY['test_admin_trigger@example.com'],
  'handle_new_user automatically provisioned admin_profile for admin role from app metadata'
);

-- Functional Test: handle_new_user() ignores client-writable user metadata role
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '99999999-9999-9999-9999-999999999993', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'test_malicious_user@example.com', 'dummy_hash', now(),
  '{"provider":"email"}', '{"role":"admin","full_name":"Malicious User"}', now(), now()
);

SELECT is_empty(
  'SELECT 1 FROM public.admin_profiles WHERE id = ''99999999-9999-9999-9999-999999999993''',
  'handle_new_user ignores role specified in raw_user_meta_data'
);

-- 3. Functional Test: handle_new_user() provisions organizer_profile for google
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '99999999-9999-9999-9999-999999999992', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'test_organizer_trigger@example.com', 'dummy_hash', now(),
  '{"provider":"google"}', '{"full_name":"Trigger Organizer"}', now(), now()
);

SELECT results_eq(
  'SELECT status FROM public.organizer_profiles WHERE id = ''99999999-9999-9999-9999-999999999992''',
  ARRAY['pending'::organizer_status_enum],
  'handle_new_user automatically provisioned organizer_profile with pending status for google provider'
);

SELECT * FROM finish();
ROLLBACK;


-- =============================================================================
-- pgTAP Test Suite: 00_schema.test.sql
-- Purpose: Verify EIRMIS table existence, columns, enums, PKs, and constraints.
-- =============================================================================

BEGIN;
SELECT plan(35);

-- 1. Table Existence Checks
SELECT has_table('public', 'organizer_profiles', 'organizer_profiles table exists');
SELECT has_table('public', 'admin_profiles', 'admin_profiles table exists');
SELECT has_table('public', 'guests', 'guests table exists');
SELECT has_table('public', 'events', 'events table exists');
SELECT has_table('public', 'invitations', 'invitations table exists');
SELECT has_table('public', 'attendees', 'attendees table exists');
SELECT has_table('public', 'headcount_increase_requests', 'headcount_increase_requests table exists');
SELECT has_table('public', 'checkin_assignments', 'checkin_assignments table exists');
SELECT has_table('public', 'reminder_schedules', 'reminder_schedules table exists');
SELECT has_table('public', 'invitation_designs', 'invitation_designs table exists');
SELECT has_table('public', 'invitation_images', 'invitation_images table exists');
SELECT has_table('public', 'org_settings', 'org_settings table exists');
SELECT has_table('public', 'email_logs', 'email_logs table exists');
SELECT has_table('public', 'audit_log_entries', 'audit_log_entries table exists');

-- 2. Enum Existence Checks
SELECT has_enum('organizer_status_enum', 'organizer_status_enum exists');
SELECT has_enum('event_status_enum', 'event_status_enum exists');
SELECT has_enum('event_visibility_enum', 'event_visibility_enum exists');
SELECT has_enum('invitation_status_enum', 'invitation_status_enum exists');
SELECT has_enum('attendee_status_enum', 'attendee_status_enum exists');
SELECT has_enum('hir_status_enum', 'hir_status_enum exists');
SELECT has_enum('design_type_enum', 'design_type_enum exists');
SELECT has_enum('design_validation_status_enum', 'design_validation_status_enum exists');
SELECT has_enum('checkin_assignment_status_enum', 'checkin_assignment_status_enum exists');
SELECT has_enum('email_log_status_enum', 'email_log_status_enum exists');
SELECT has_enum('audit_actor_type_enum', 'audit_actor_type_enum exists');

-- 3. Primary Key & Check Constraints
SELECT has_pk('organizer_profiles', 'organizer_profiles has a primary key');
SELECT has_pk('admin_profiles', 'admin_profiles has a primary key');
SELECT has_pk('guests', 'guests has a primary key');
SELECT has_pk('events', 'events has a primary key');
SELECT has_pk('invitations', 'invitations has a primary key');
SELECT has_pk('attendees', 'attendees has a primary key');
SELECT has_pk('headcount_increase_requests', 'headcount_increase_requests has a primary key');
SELECT has_pk('checkin_assignments', 'checkin_assignments has a primary key');
SELECT has_pk('org_settings', 'org_settings has a primary key');

-- 4. Invariant Check Constraints on Events table
SELECT has_check('events', 'events has check constraints');

SELECT * FROM finish();
ROLLBACK;


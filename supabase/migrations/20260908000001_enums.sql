-- =============================================================================
-- Migration: 20260908000001_enums.sql
-- Purpose:   Define all application-level Postgres enum types.
--            Must run before any table that references these types.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- OrganizerProfile.status
-- ---------------------------------------------------------------------------
create type organizer_status_enum as enum (
  'pending',   -- newly self-registered; awaiting admin verification
  'active'     -- verified; can create and manage events
);

-- ---------------------------------------------------------------------------
-- Event.status
-- ---------------------------------------------------------------------------
create type event_status_enum as enum (
  'draft',      -- in preparation; not visible to guests
  'published',  -- open for guest actions (RSVP, attendee submission, headcount requests)
  'closed',     -- RSVP deadline passed; read-only for guests
  'archived'    -- fully concluded; soft-deleted or historically retained
);

-- ---------------------------------------------------------------------------
-- Event.visibility_mode
-- ---------------------------------------------------------------------------
create type event_visibility_enum as enum (
  'open_registration',  -- public self-service via /register/:slug
  'invite_only'         -- organizer builds/imports guest list; no public entry point
);

-- ---------------------------------------------------------------------------
-- Invitation.status
-- ---------------------------------------------------------------------------
create type invitation_status_enum as enum (
  'pending',     -- invitation sent; guest has not yet responded
  'accepted',    -- guest confirmed attendance
  'declined',    -- guest declined; no roster submission needed
  'tentative',   -- guest indicated interest but not committed; no capacity reservation
  'waitlisted'   -- event at capacity; invitation queued in strict FIFO order
);

-- ---------------------------------------------------------------------------
-- Attendee.status
-- ---------------------------------------------------------------------------
create type attendee_status_enum as enum (
  'pending',   -- submitted by guest; awaiting organizer review
  'approved',  -- organizer approved; counted toward party_size and issued a qr_token
  'rejected'   -- organizer rejected; can be edited and resubmitted by guest
);

-- ---------------------------------------------------------------------------
-- HeadcountIncreaseRequest.status
-- ---------------------------------------------------------------------------
create type hir_status_enum as enum (
  'pending',   -- submitted; awaiting organizer decision
  'approved',  -- max_party_size raised by requested_additional_heads
  'rejected'   -- request denied; guest notified
);

-- ---------------------------------------------------------------------------
-- InvitationDesign.design_type
-- ---------------------------------------------------------------------------
create type design_type_enum as enum (
  'images',  -- ordered gallery of image files
  'html'     -- single self-contained HTML file (requires two-stage validation)
);

-- ---------------------------------------------------------------------------
-- InvitationDesign.validation_status  (only meaningful when design_type = 'html')
-- ---------------------------------------------------------------------------
create type design_validation_status_enum as enum (
  'pending',  -- awaiting asynchronous malware/heuristic scan result
  'passed',   -- both structural scan and malware scan cleared; may be served to guests
  'failed'    -- one or both scans failed; never served to guests
);

-- ---------------------------------------------------------------------------
-- CheckInAssignment.status
-- ---------------------------------------------------------------------------
create type checkin_assignment_status_enum as enum (
  'invited',   -- email sent to staff member; they have not yet logged in
  'active',    -- staff member completed magic-link login; assignment is live
  'revoked'    -- organizer cut off access; immediately blocks further check-in
);

-- ---------------------------------------------------------------------------
-- EmailLog.status
-- ---------------------------------------------------------------------------
create type email_log_status_enum as enum (
  'queued',  -- record created; not yet dispatched
  'sent',    -- successfully accepted by Resend
  'failed'   -- delivery attempt failed; see provider_message_id for details
);

-- ---------------------------------------------------------------------------
-- AuditLogEntry.actor_type
-- Identifies which kind of identity performed the audited action.
-- ---------------------------------------------------------------------------
create type audit_actor_type_enum as enum (
  'organizer',       -- action by an OrganizerProfile (actor_id = organizer_profiles.id)
  'guest',           -- action by a Guest (actor_id = guests.id)
  'check_in_staff',  -- action by a CheckInAssignment holder (actor_id = checkin_assignments.id)
  'system'           -- action by a scheduled job or automated process (actor_id = null)
);

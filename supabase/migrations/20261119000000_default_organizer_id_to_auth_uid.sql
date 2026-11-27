-- =============================================================================
-- Migration: 20261119000000_default_organizer_id_to_auth_uid.sql
-- Purpose:   Allow authenticated organizers to create events and check-in
--            assignments without explicitly passing organizer_id / invited_by
--            in the request payload (matching the OpenAPI EventCreate and
--            CheckInAssignmentCreate schemas).
-- =============================================================================

ALTER TABLE public.events
  ALTER COLUMN organizer_id SET DEFAULT auth.uid();

ALTER TABLE public.checkin_assignments
  ALTER COLUMN invited_by SET DEFAULT auth.uid();

ALTER TABLE public.invitations
  ALTER COLUMN invited_by SET DEFAULT auth.uid();

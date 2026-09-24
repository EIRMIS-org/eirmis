-- =============================================================================
-- Migration: 20260917064854_fix_rls_recursion.sql
-- Purpose:   Fix RLS infinite recursion by replacing direct table queries
--            with security definer functions, and align access models.
--            (Squashed migration resolving multiple M1-09 gaps)
-- =============================================================================

-- 1. Helper Functions
CREATE OR REPLACE FUNCTION public.is_event_organizer(e_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events WHERE id = e_id AND organizer_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_guest(g_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM guests WHERE id = g_id AND auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_staff(e_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM checkin_assignments
    WHERE event_id = e_id AND auth_user_id = auth.uid() AND status = 'active'
  );
$$;

-- Drop orphaned helper if exists
DROP FUNCTION IF EXISTS public.is_event_guest(uuid);

-- 2. Policies

-- events
DROP POLICY IF EXISTS "events: guest reads invited published" ON events;
CREATE POLICY "events: guest reads invited published"
  ON events FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM invitations i WHERE i.event_id = events.id AND public.is_guest(i.guest_id)
  ));

DROP POLICY IF EXISTS "events: staff reads assigned" ON events;
CREATE POLICY "events: staff reads assigned"
  ON events FOR SELECT
  USING (deleted_at IS NULL AND public.is_event_staff(id));

-- invitations
DROP POLICY IF EXISTS "invitations: organizer reads event invitations" ON invitations;
CREATE POLICY "invitations: organizer reads event invitations"
  ON invitations FOR SELECT USING (public.is_event_organizer(event_id));

DROP POLICY IF EXISTS "invitations: organizer inserts for own event" ON invitations;
CREATE POLICY "invitations: organizer inserts for own event"
  ON invitations FOR INSERT WITH CHECK (public.is_event_organizer(event_id));

DROP POLICY IF EXISTS "invitations: organizer updates for own event" ON invitations;
CREATE POLICY "invitations: organizer updates for own event"
  ON invitations FOR UPDATE USING (public.is_event_organizer(event_id));

DROP POLICY IF EXISTS "invitations: guest reads own" ON invitations;
CREATE POLICY "invitations: guest reads own"
  ON invitations FOR SELECT USING (public.is_guest(guest_id));

DROP POLICY IF EXISTS "invitations: guest updates own" ON invitations;
CREATE POLICY "invitations: guest updates own"
  ON invitations FOR UPDATE USING (public.is_guest(guest_id)) WITH CHECK (public.is_guest(guest_id));

-- guests
DROP POLICY IF EXISTS "guests: organizer reads invited guests" ON guests;
CREATE POLICY "guests: organizer reads invited guests"
  ON guests FOR SELECT USING (
    EXISTS (SELECT 1 FROM invitations i WHERE i.guest_id = guests.id AND public.is_event_organizer(i.event_id))
  );

-- checkin_assignments
DROP POLICY IF EXISTS "checkin_assignments: organizer manages own event" ON checkin_assignments;
CREATE POLICY "checkin_assignments: organizer manages own event"
  ON checkin_assignments FOR ALL
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id));

-- attendees
DROP POLICY IF EXISTS "attendees: organizer reads event attendees" ON attendees;
CREATE POLICY "attendees: organizer reads event attendees"
  ON attendees FOR SELECT USING (
    EXISTS (SELECT 1 FROM invitations i WHERE i.id = attendees.invitation_id AND public.is_event_organizer(i.event_id))
  );

DROP POLICY IF EXISTS "attendees: guest reads own invitation attendees" ON attendees;
CREATE POLICY "attendees: guest reads own invitation attendees"
  ON attendees FOR SELECT USING (
    EXISTS (SELECT 1 FROM invitations i WHERE i.id = attendees.invitation_id AND public.is_guest(i.guest_id))
  );

DROP POLICY IF EXISTS "attendees: guest inserts additional attendees" ON attendees;
CREATE POLICY "attendees: guest inserts additional attendees"
  ON attendees FOR INSERT WITH CHECK (
    is_primary = false AND is_walk_in = false AND EXISTS (
      SELECT 1 FROM invitations i WHERE i.id = attendees.invitation_id AND public.is_guest(i.guest_id) AND i.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "attendees: guest updates own non-primary pending/rejected" ON attendees;
CREATE POLICY "attendees: guest updates own non-primary pending/rejected"
  ON attendees FOR UPDATE USING (
    is_primary = false AND status in ('pending', 'rejected') AND EXISTS (
      SELECT 1 FROM invitations i WHERE i.id = attendees.invitation_id AND public.is_guest(i.guest_id)
    )
  ) WITH CHECK (
    is_primary = false AND EXISTS (
      SELECT 1 FROM invitations i WHERE i.id = attendees.invitation_id AND public.is_guest(i.guest_id)
    )
  );

-- headcount_increase_requests (hir)
DROP POLICY IF EXISTS "hir: organizer reads event requests" ON headcount_increase_requests;
CREATE POLICY "hir: organizer reads event requests"
  ON headcount_increase_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM invitations i WHERE i.id = headcount_increase_requests.invitation_id AND public.is_event_organizer(i.event_id))
  );

DROP POLICY IF EXISTS "hir: guest reads own" ON headcount_increase_requests;
CREATE POLICY "hir: guest reads own"
  ON headcount_increase_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM invitations i WHERE i.id = headcount_increase_requests.invitation_id AND public.is_guest(i.guest_id))
  );

DROP POLICY IF EXISTS "hir: guest inserts for own accepted invitation" ON headcount_increase_requests;
CREATE POLICY "hir: guest inserts for own accepted invitation"
  ON headcount_increase_requests FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM invitations i WHERE i.id = headcount_increase_requests.invitation_id AND public.is_guest(i.guest_id) AND i.status = 'accepted')
  );

-- reminder_schedules
DROP POLICY IF EXISTS "reminder_schedules: organizer manages own event" ON reminder_schedules;
CREATE POLICY "reminder_schedules: organizer manages own event"
  ON reminder_schedules FOR ALL USING (public.is_event_organizer(event_id)) WITH CHECK (public.is_event_organizer(event_id));

-- invitation_designs
-- NOTE: Check-in Staff are deliberately excluded from viewing designs.
DROP POLICY IF EXISTS "invitation_designs: organizer manages own event" ON invitation_designs;
CREATE POLICY "invitation_designs: organizer manages own event"
  ON invitation_designs FOR ALL USING (public.is_event_organizer(event_id)) WITH CHECK (public.is_event_organizer(event_id));

DROP POLICY IF EXISTS "invitation_designs: public reads passed design for open-reg event" ON invitation_designs;
CREATE POLICY "invitation_designs: public reads passed design for open-reg event"
  ON invitation_designs FOR SELECT USING (
    (design_type = 'images' OR validation_status = 'passed') AND
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.visibility_mode = 'open_registration' AND e.status = 'published')
  );

-- invitation_images
-- NOTE: Check-in Staff are deliberately excluded from viewing images.
DROP POLICY IF EXISTS "invitation_images: organizer manages own event" ON invitation_images;
CREATE POLICY "invitation_images: organizer manages own event"
  ON invitation_images FOR ALL USING (public.is_event_organizer(event_id)) WITH CHECK (public.is_event_organizer(event_id));

-- email_logs
DROP POLICY IF EXISTS "email_logs: organizer reads own event logs" ON email_logs;
CREATE POLICY "email_logs: organizer reads own event logs"
  ON email_logs FOR SELECT USING (event_id IS NOT NULL AND public.is_event_organizer(event_id));

DROP POLICY IF EXISTS "email_logs: guest reads own invitation logs" ON email_logs;
CREATE POLICY "email_logs: guest reads own invitation logs"
  ON email_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM invitations i WHERE i.id = email_logs.invitation_id AND public.is_guest(i.guest_id))
  );

-- audit_log_entries
DROP POLICY IF EXISTS "audit_log_entries: organizer reads own event entries" ON audit_log_entries;
CREATE POLICY "audit_log_entries: organizer reads own event entries"
  ON audit_log_entries FOR SELECT USING (
    (actor_type = 'organizer' AND actor_id = auth.uid()) OR
    (entity_type = 'event' AND public.is_event_organizer(entity_id::uuid)) OR
    (entity_type = 'invitation' AND EXISTS (SELECT 1 FROM invitations i WHERE i.id = entity_id::uuid AND public.is_event_organizer(i.event_id))) OR
    (entity_type = 'attendee' AND EXISTS (SELECT 1 FROM attendees a JOIN invitations i ON i.id = a.invitation_id WHERE a.id = entity_id::uuid AND public.is_event_organizer(i.event_id))) OR
    (entity_type = 'checkin_assignment' AND EXISTS (SELECT 1 FROM checkin_assignments c WHERE c.id = entity_id::uuid AND public.is_event_organizer(c.event_id))) OR
    (entity_type = 'invitation_design' AND EXISTS (SELECT 1 FROM invitation_designs d WHERE d.id = entity_id::uuid AND public.is_event_organizer(d.event_id))) OR
    (entity_type = 'headcount_increase_request' AND EXISTS (SELECT 1 FROM headcount_increase_requests h JOIN invitations i ON i.id = h.invitation_id WHERE h.id = entity_id::uuid AND public.is_event_organizer(i.event_id)))
  );

-- 3. RSVP deadline triggers on attendee + HIR INSERT
CREATE OR REPLACE FUNCTION fn_enforce_rsvp_deadline_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_rsvp_deadline timestamptz;
BEGIN
  SELECT e.rsvp_deadline INTO v_rsvp_deadline
  FROM events e
  JOIN invitations i ON i.event_id = e.id
  WHERE i.id = NEW.invitation_id;

  IF v_rsvp_deadline IS NOT NULL AND now() > v_rsvp_deadline THEN
    RAISE EXCEPTION 'RSVP deadline has passed for this event.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendee_insert_enforce_rsvp_deadline ON attendees;
CREATE TRIGGER trg_attendee_insert_enforce_rsvp_deadline
  BEFORE INSERT ON attendees
  FOR EACH ROW EXECUTE FUNCTION fn_enforce_rsvp_deadline_insert();

DROP TRIGGER IF EXISTS trg_hir_insert_enforce_rsvp_deadline ON headcount_increase_requests;
CREATE TRIGGER trg_hir_insert_enforce_rsvp_deadline
  BEFORE INSERT ON headcount_increase_requests
  FOR EACH ROW EXECUTE FUNCTION fn_enforce_rsvp_deadline_insert();
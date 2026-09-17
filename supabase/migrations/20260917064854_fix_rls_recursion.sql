-- Define SECURITY DEFINER functions to break RLS infinite recursion
CREATE OR REPLACE FUNCTION public.is_event_organizer(e_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events
    WHERE id = e_id AND organizer_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_guest(e_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM invitations i
    JOIN guests g ON g.id = i.guest_id
    WHERE i.event_id = e_id AND g.auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_staff(e_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM checkin_assignments
    WHERE event_id = e_id AND auth_user_id = auth.uid() AND status = 'active'
  );
$$;

-- 1. events
DROP POLICY IF EXISTS "events: guest reads invited published" ON events;
CREATE POLICY "events: guest reads invited published"
  ON events FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL AND public.is_event_guest(id));

DROP POLICY IF EXISTS "events: staff reads assigned" ON events;
CREATE POLICY "events: staff reads assigned"
  ON events FOR SELECT
  USING (deleted_at IS NULL AND public.is_event_staff(id));

-- 2. invitations
DROP POLICY IF EXISTS "invitations: organizer reads event invitations" ON invitations;
CREATE POLICY "invitations: organizer reads event invitations"
  ON invitations FOR SELECT
  USING (public.is_event_organizer(event_id));

DROP POLICY IF EXISTS "invitations: organizer inserts for own event" ON invitations;
CREATE POLICY "invitations: organizer inserts for own event"
  ON invitations FOR INSERT
  WITH CHECK (public.is_event_organizer(event_id));

DROP POLICY IF EXISTS "invitations: organizer updates for own event" ON invitations;
CREATE POLICY "invitations: organizer updates for own event"
  ON invitations FOR UPDATE
  USING (public.is_event_organizer(event_id));

-- 3. guests
DROP POLICY IF EXISTS "guests: organizer reads invited guests" ON guests;
CREATE POLICY "guests: organizer reads invited guests"
  ON guests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invitations i
      WHERE i.guest_id = guests.id AND public.is_event_organizer(i.event_id)
    )
  );

-- 4. attendees
DROP POLICY IF EXISTS "attendees: organizer reads event attendees" ON attendees;
CREATE POLICY "attendees: organizer reads event attendees"
  ON attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invitations i
      WHERE i.id = attendees.invitation_id AND public.is_event_organizer(i.event_id)
    )
  );

-- 5. headcount_increase_requests
DROP POLICY IF EXISTS "hir: organizer reads event requests" ON headcount_increase_requests;
CREATE POLICY "hir: organizer reads event requests"
  ON headcount_increase_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invitations i
      WHERE i.id = headcount_increase_requests.invitation_id AND public.is_event_organizer(i.event_id)
    )
  );

-- 6. reminder_schedules
DROP POLICY IF EXISTS "reminder_schedules: organizer manages own event" ON reminder_schedules;
CREATE POLICY "reminder_schedules: organizer manages own event"
  ON reminder_schedules FOR ALL
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id));

-- 7. invitation_designs
DROP POLICY IF EXISTS "designs: organizer manages own event" ON invitation_designs;
CREATE POLICY "designs: organizer manages own event"
  ON invitation_designs FOR ALL
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id));

-- 8. invitation_images
DROP POLICY IF EXISTS "images: organizer manages own event" ON invitation_images;
CREATE POLICY "images: organizer manages own event"
  ON invitation_images FOR ALL
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id));

-- 9. checkin_assignments
DROP POLICY IF EXISTS "checkin_assignments: organizer manages own event" ON checkin_assignments;
CREATE POLICY "checkin_assignments: organizer manages own event"
  ON checkin_assignments FOR ALL
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id));

-- 10. email_logs
DROP POLICY IF EXISTS "email_logs: organizer reads own event" ON email_logs;
CREATE POLICY "email_logs: organizer reads own event"
  ON email_logs FOR SELECT
  USING (event_id IS NOT NULL AND public.is_event_organizer(event_id));

-- 11. audit_log_entries
DROP POLICY IF EXISTS "audit: organizer reads own event" ON audit_log_entries;
CREATE POLICY "audit: organizer reads own event"
  ON audit_log_entries FOR SELECT
  USING (
    (entity_type = 'event' AND public.is_event_organizer(entity_id::uuid))
    OR
    (entity_type = 'invitation' AND EXISTS (
      SELECT 1 FROM invitations i WHERE i.id = entity_id::uuid AND public.is_event_organizer(i.event_id)
    ))
    OR
    (entity_type = 'attendee' AND EXISTS (
      SELECT 1 FROM attendees a 
      JOIN invitations i ON i.id = a.invitation_id 
      WHERE a.id = entity_id::uuid AND public.is_event_organizer(i.event_id)
    ))
  );
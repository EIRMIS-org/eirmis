-- =============================================================================
-- Migration: 20260908000009_rls_recursion_fix.sql
-- Purpose:   Fix RLS infinite recursion by replacing direct table queries
--            in circular dependencies with security definer functions.
-- =============================================================================

-- 1. Create a helper function to bypass RLS when checking event organizer
create or replace function public.is_event_organizer(e_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_is_organizer boolean;
begin
  select exists (
    select 1 from events where id = e_id and organizer_id = auth.uid()
  ) into v_is_organizer;
  return v_is_organizer;
end;
$$;

-- Create a helper function to bypass RLS when checking if current user is guest
create or replace function public.is_guest(g_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_is_guest boolean;
begin
  select exists (
    select 1 from guests where id = g_id and auth_user_id = auth.uid()
  ) into v_is_guest;
  return v_is_guest;
end;
$$;


-- 2. Drop and recreate policies for reminder_schedules
drop policy if exists "reminder_schedules: organizer manages own event" on reminder_schedules;
create policy "reminder_schedules: organizer manages own event"
  on reminder_schedules for all
  using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id));

-- 3. Drop and recreate policies for invitations
drop policy if exists "invitations: organizer reads event invitations" on invitations;
drop policy if exists "invitations: organizer inserts for own event" on invitations;
drop policy if exists "invitations: organizer updates for own event" on invitations;
drop policy if exists "invitations: guest reads own" on invitations;
drop policy if exists "invitations: guest updates own" on invitations;

create policy "invitations: organizer reads event invitations"
  on invitations for select
  using (public.is_event_organizer(event_id));

create policy "invitations: organizer inserts for own event"
  on invitations for insert
  with check (public.is_event_organizer(event_id));

create policy "invitations: organizer updates for own event"
  on invitations for update
  using (public.is_event_organizer(event_id));

create policy "invitations: guest reads own"
  on invitations for select
  using (public.is_guest(guest_id));

create policy "invitations: guest updates own"
  on invitations for update
  using (public.is_guest(guest_id))
  with check (public.is_guest(guest_id));

-- 4. Drop and recreate policies for guests (reads invited guests)
drop policy if exists "guests: organizer reads invited guests" on guests;
create policy "guests: organizer reads invited guests"
  on guests for select
  using (
    exists (
      select 1
      from invitations i
      where i.guest_id = guests.id
        and public.is_event_organizer(i.event_id)
    )
  );

-- 5. Drop and recreate policies for checkin_assignments
drop policy if exists "checkin_assignments: organizer manages own event" on checkin_assignments;
create policy "checkin_assignments: organizer manages own event"
  on checkin_assignments for all
  using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id));

-- 6. Drop and recreate policies for attendees
drop policy if exists "attendees: organizer reads event attendees" on attendees;
create policy "attendees: organizer reads event attendees"
  on attendees for select
  using (
    exists (
      select 1
      from invitations i
      where i.id = attendees.invitation_id
        and public.is_event_organizer(i.event_id)
    )
  );

drop policy if exists "attendees: guest reads own invitation attendees" on attendees;
create policy "attendees: guest reads own invitation attendees"
  on attendees for select
  using (
    exists (
      select 1
      from invitations i
      where i.id = attendees.invitation_id
        and public.is_guest(i.guest_id)
    )
  );

drop policy if exists "attendees: guest inserts additional attendees" on attendees;
create policy "attendees: guest inserts additional attendees"
  on attendees for insert
  with check (
    is_primary = false
    and is_walk_in = false
    and exists (
      select 1
      from invitations i
      where i.id = attendees.invitation_id
        and public.is_guest(i.guest_id)
        and i.status = 'accepted'
    )
  );

drop policy if exists "attendees: guest updates own non-primary pending/rejected" on attendees;
create policy "attendees: guest updates own non-primary pending/rejected"
  on attendees for update
  using (
    is_primary = false
    and status in ('pending', 'rejected')
    and exists (
      select 1
      from invitations i
      where i.id = attendees.invitation_id
        and public.is_guest(i.guest_id)
    )
  )
  with check (
    is_primary = false
    and exists (
      select 1
      from invitations i
      where i.id = attendees.invitation_id
        and public.is_guest(i.guest_id)
    )
  );

-- 7. Drop and recreate policies for headcount_increase_requests (hir)
drop policy if exists "hir: organizer reads event requests" on headcount_increase_requests;
create policy "hir: organizer reads event requests"
  on headcount_increase_requests for select
  using (
    exists (
      select 1
      from invitations i
      where i.id = headcount_increase_requests.invitation_id
        and public.is_event_organizer(i.event_id)
    )
  );

drop policy if exists "hir: guest reads own" on headcount_increase_requests;
create policy "hir: guest reads own"
  on headcount_increase_requests for select
  using (
    exists (
      select 1
      from invitations i
      where i.id = headcount_increase_requests.invitation_id
        and public.is_guest(i.guest_id)
    )
  );

drop policy if exists "hir: guest inserts for own accepted invitation" on headcount_increase_requests;
create policy "hir: guest inserts for own accepted invitation"
  on headcount_increase_requests for insert
  with check (
    exists (
      select 1
      from invitations i
      where i.id = headcount_increase_requests.invitation_id
        and public.is_guest(i.guest_id)
        and i.status = 'accepted'
    )
  );

-- 8. Drop and recreate policies for invitation_designs
drop policy if exists "invitation_designs: organizer manages own event" on invitation_designs;
create policy "invitation_designs: organizer manages own event"
  on invitation_designs for all
  using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id));

-- 9. Drop and recreate policies for invitation_images
drop policy if exists "invitation_images: organizer manages own event" on invitation_images;
create policy "invitation_images: organizer manages own event"
  on invitation_images for all
  using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id));

-- 10. Drop and recreate policies for email_logs
drop policy if exists "email_logs: organizer reads own event logs" on email_logs;
create policy "email_logs: organizer reads own event logs"
  on email_logs for select
  using (
    event_id is not null
    and public.is_event_organizer(event_id)
  );

-- 11. Drop and recreate policies for audit_log_entries
drop policy if exists "audit_log_entries: organizer reads own event entries" on audit_log_entries;
create policy "audit_log_entries: organizer reads own event entries"
  on audit_log_entries for select
  using (
    (actor_type = 'organizer' and actor_id = auth.uid())
    or
    (entity_type = 'attendee' and exists (
      select 1
      from attendees a
      join invitations i on i.id = a.invitation_id
      where a.id = audit_log_entries.entity_id
        and public.is_event_organizer(i.event_id)
    ))
    or
    (entity_type = 'invitation' and exists (
      select 1
      from invitations i
      where i.id = audit_log_entries.entity_id
        and public.is_event_organizer(i.event_id)
    ))
  );

-- 12. Fix events guest policy
drop policy if exists "events: guest reads invited published" on events;
create policy "events: guest reads invited published"
  on events for select
  using (
    status = 'published'
    and deleted_at is null
    and exists (
      select 1
      from invitations i
      where i.event_id = events.id
        and public.is_guest(i.guest_id)
    )
  );

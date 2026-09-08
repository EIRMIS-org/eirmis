-- =============================================================================
-- Migration: 20260908000006_checkin.sql
-- Purpose:   Create the checkin_assignments table, which delegates event-day
--            check-in access to named staff members on a per-event basis.
--
--            Access scope is tightly constrained by RLS:
--              - Read/write restricted to the single assigned event
--              - status must be 'active' (set on first magic-link login)
--              - Organizer can revoke at any time (status → 'revoked')
--
-- Depends on: 20260908000001_enums.sql
--             20260908000002_profiles.sql  (organizer_profiles FK)
--             20260908000003_events.sql    (events FK)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- checkin_assignments
-- An organizer-created row delegating check-in access for one event to one
-- named staff member (identified by email). The staff member authenticates via
-- the same passwordless magic-link mechanism as guests (from /staff/login).
--
-- auth_user_id — null until the staff member completes their first magic-link
--                login. Populated lazily by the auth.users linkage trigger
--                (same pattern as guests.auth_user_id). On first login, the
--                trigger also flips status from 'invited' to 'active'.
--
-- A staff member's access is entirely defined by their active assignment row:
-- RLS on every other table checks for a matching, active checkin_assignment.
-- Revoking the assignment (status → 'revoked') immediately cuts off access.
-- ---------------------------------------------------------------------------
create table checkin_assignments (
  id           uuid                          primary key default gen_random_uuid(),
  event_id     uuid                          not null references events (id) on delete cascade,
  staff_email  text                          not null,
  auth_user_id uuid                          unique references auth.users (id) on delete set null,
                                             -- nullable; lazy-linked on first magic-link login
  invited_by   uuid                          not null references organizer_profiles (id),
  status       checkin_assignment_status_enum not null default 'invited',

  created_at   timestamptz                   not null default now(),
  updated_at   timestamptz                   not null default now(),

  -- A given email address may only have one assignment per event at a time.
  -- (Multiple historical assignments — invited → revoked → re-invited — are
  -- handled by the application deleting the old row before creating a new one,
  -- or by reactivating the existing revoked row. A hard UNIQUE constraint here
  -- prevents silent duplicate assignments.)
  constraint checkin_assignments_unique_email_per_event unique (event_id, staff_email)
);

comment on table  checkin_assignments              is 'Delegates event-day check-in access to a named staff member for a single event. Access is scoped by RLS to the assigned event only.';
comment on column checkin_assignments.staff_email  is 'The email address the invitation magic-link is sent to. Used to match the auth.users row on first login.';
comment on column checkin_assignments.auth_user_id is 'FK to auth.users.id. NULL until the staff member completes their first magic-link login. Set by the auth linkage trigger, not by client code.';
comment on column checkin_assignments.status       is 'invited = email sent, not yet logged in; active = logged in and working; revoked = access removed by organizer.';

create trigger trg_checkin_assignments_updated_at
  before update on checkin_assignments
  for each row execute function set_updated_at();

-- Indexes (D16)
create index idx_checkin_assignments_event_id          on checkin_assignments (event_id);
create index idx_checkin_assignments_event_auth_status on checkin_assignments (event_id, auth_user_id, status);
                                                        -- hot path for RLS scope checks
create index idx_checkin_assignments_staff_email_event on checkin_assignments (staff_email, event_id);
                                                        -- lookup on login (before auth_user_id is set)

-- Row Level Security
alter table checkin_assignments enable row level security;

-- Organizers may fully manage assignments for their own events.
create policy "checkin_assignments: organizer manages own event"
  on checkin_assignments for all
  using (
    exists (
      select 1 from events e
      where e.id = checkin_assignments.event_id
        and e.organizer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from events e
      where e.id = checkin_assignments.event_id
        and e.organizer_id = auth.uid()
    )
  );

-- Check-in staff may read their own assignment row
-- (so the client can confirm their scope and display the event name).
create policy "checkin_assignments: staff reads own active assignment"
  on checkin_assignments for select
  using (
    auth_user_id = auth.uid()
    and status = 'active'
  );

-- The auth linkage trigger (which sets auth_user_id and flips status to 'active'
-- on first login) runs under the service role — no client UPDATE policy for
-- those columns is granted here. The only client-visible update is the organizer
-- changing status to 'revoked', which is covered by the organizer policy above.

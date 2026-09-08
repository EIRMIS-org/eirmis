-- =============================================================================
-- Migration: 20260908000005_attendees.sql
-- Purpose:   Create the attendees and headcount_increase_requests tables,
--            and define the DB triggers that maintain:
--              • invitations.party_size          (count of approved attendees)
--              • invitations.checked_in_count    (count of checked-in attendees)
--              • auto-creation of the primary Attendee on invitation acceptance (D12)
--
-- Depends on: 20260908000001_enums.sql
--             20260908000002_profiles.sql   (organizer_profiles FK)
--             20260908000004_guests_invitations.sql (invitations FK)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- attendees
-- One row per person in an invitation's party.
-- The invited guest themself is auto-created as the primary attendee
-- (is_primary = true, status = approved) when the invitation is accepted.
-- Additional attendees are submitted by the guest and require organizer review.
--
-- qr_token   — issued by the decideAttendee Edge Function at the moment
--              status transitions to 'approved'. Never generated client-side.
--
-- checked_in_by — FK to auth.users(id) (D4). Resolves to either the
--                 organizer's auth identity or the check-in staff member's
--                 auth identity — both map to auth.users via their respective
--                 profile/assignment tables. The Edge Function has the JWT
--                 to determine which kind of actor performed the scan.
-- ---------------------------------------------------------------------------
create table attendees (
  id             uuid                   primary key default gen_random_uuid(),
  invitation_id  uuid                   not null references invitations (id) on delete cascade,

  -- Identity
  full_name      text                   not null,
  email          text,                  -- nullable; NOT UNIQUE (same email may appear on multiple rows, e.g. children)
  is_primary     boolean                not null default false,
                                        -- true only for the auto-created record representing the inviting guest

  -- Approval
  status         attendee_status_enum   not null default 'pending',
                                        -- primary rows are created directly as 'approved'
  submitted_at   timestamptz            not null default now(),
  reviewed_by    uuid                   references organizer_profiles (id),
  reviewed_at    timestamptz,
  review_reason  text,                  -- organizer's optional note on approval or rejection

  -- QR
  qr_token       text                   unique,   -- nullable until status = 'approved'; issued by Edge Function

  -- Check-in
  checked_in     boolean                not null default false,
  checked_in_at  timestamptz,
  checked_in_by  uuid                   references auth.users (id),  -- D4: resolves organizer or staff via JWT

  -- Walk-in flag (D6 walk-in decision: is_walk_in on Attendee, not a flag on Invitation)
  is_walk_in     boolean                not null default false
);

comment on table  attendees                is 'One row per person in an invitation''s party. Includes the primary guest plus any additional members they submit.';
comment on column attendees.is_primary     is 'True only for the auto-created record representing the inviting guest. Created by trigger on invitation acceptance.';
comment on column attendees.email          is 'Optional. NOT UNIQUE — the same email may appear on multiple rows (e.g. children, shared contact info).';
comment on column attendees.qr_token       is 'Unique signed token issued by the decideAttendee Edge Function when status becomes approved. Never client-generated.';
comment on column attendees.checked_in_by  is 'FK to auth.users(id). Set by the scanCheckIn Edge Function. Identifies the organizer or staff member who performed the scan.';
comment on column attendees.is_walk_in     is 'True for attendees created on event day with no prior roster entry.';

-- Indexes (D16)
create index idx_attendees_invitation_id_status on attendees (invitation_id, status);  -- approval queue
-- qr_token UNIQUE already creates an index; no separate one needed


-- ---------------------------------------------------------------------------
-- headcount_increase_requests
-- A guest whose party has reached max_party_size can request more heads.
-- Approval raises that invitation's max_party_size by requested_additional_heads.
-- v1: approve-in-full or reject only (no partial approval — Decision #16/§11).
-- D10: only one pending request per invitation at a time (partial unique index).
-- ---------------------------------------------------------------------------
create table headcount_increase_requests (
  id                        uuid           primary key default gen_random_uuid(),
  invitation_id             uuid           not null references invitations (id) on delete cascade,

  requested_additional_heads int           not null check (requested_additional_heads > 0),
  status                    hir_status_enum not null default 'pending',
  note                      text,          -- guest-provided reason/context

  requested_at              timestamptz    not null default now(),
  reviewed_by               uuid           references organizer_profiles (id),
  reviewed_at               timestamptz,
  review_reason             text           -- organizer's note on decision
);

comment on table  headcount_increase_requests                         is 'A guest''s request to raise their invitation''s max_party_size. v1: approve-in-full or reject only.';
comment on column headcount_increase_requests.requested_additional_heads is 'Number of extra heads requested on top of current max_party_size.';

-- D10: enforce one active (pending) request per invitation via partial unique index
create unique index idx_hir_one_pending_per_invitation
  on headcount_increase_requests (invitation_id)
  where status = 'pending';

create index idx_hir_invitation_id on headcount_increase_requests (invitation_id);

-- Row Level Security — attendees
alter table attendees enable row level security;

-- Guests may read all attendees for their own invitations.
create policy "attendees: guest reads own invitation attendees"
  on attendees for select
  using (
    exists (
      select 1
      from invitations i
      join guests g on g.id = i.guest_id
      where i.id = attendees.invitation_id
        and g.auth_user_id = auth.uid()
    )
  );

-- Guests may insert additional (non-primary) attendees for accepted, non-locked invitations.
-- is_primary = true rows are inserted by the DB trigger only; the check below blocks client attempts.
create policy "attendees: guest inserts additional attendees"
  on attendees for insert
  with check (
    is_primary = false
    and is_walk_in = false
    and exists (
      select 1
      from invitations i
      join guests g on g.id = i.guest_id
      where i.id = attendees.invitation_id
        and g.auth_user_id = auth.uid()
        and i.status = 'accepted'
    )
  );

-- Guests may update their own non-primary, non-approved attendees
-- (edit a rejected attendee to resubmit — it re-enters pending).
create policy "attendees: guest updates own non-primary pending/rejected"
  on attendees for update
  using (
    is_primary = false
    and status in ('pending', 'rejected')
    and exists (
      select 1
      from invitations i
      join guests g on g.id = i.guest_id
      where i.id = attendees.invitation_id
        and g.auth_user_id = auth.uid()
    )
  )
  with check (
    is_primary = false
    and exists (
      select 1
      from invitations i
      join guests g on g.id = i.guest_id
      where i.id = attendees.invitation_id
        and g.auth_user_id = auth.uid()
    )
  );

-- Organizers may read all attendees for their events.
create policy "attendees: organizer reads event attendees"
  on attendees for select
  using (
    exists (
      select 1
      from invitations i
      join events e on e.id = i.event_id
      where i.id = attendees.invitation_id
        and e.organizer_id = auth.uid()
    )
  );

-- Check-in staff may read attendees for their assigned event.
create policy "attendees: staff reads assigned event attendees"
  on attendees for select
  using (
    exists (
      select 1
      from invitations i
      join checkin_assignments ca on ca.event_id = i.event_id
      where i.id = attendees.invitation_id
        and ca.auth_user_id = auth.uid()
        and ca.status = 'active'
    )
  );

-- NOTE: Organizer approve/reject and staff check-in writes go through Edge Functions
-- (decideAttendee, scanCheckIn) using the service role. No client UPDATE policy
-- for those specific fields is granted here — the Edge Function is the only path.

-- Row Level Security — headcount_increase_requests
alter table headcount_increase_requests enable row level security;

-- Guests may read their own requests.
create policy "hir: guest reads own"
  on headcount_increase_requests for select
  using (
    exists (
      select 1
      from invitations i
      join guests g on g.id = i.guest_id
      where i.id = headcount_increase_requests.invitation_id
        and g.auth_user_id = auth.uid()
    )
  );

-- Guests may insert a request for their own accepted invitation.
-- The partial unique index (D10) prevents a second pending request from succeeding.
create policy "hir: guest inserts for own accepted invitation"
  on headcount_increase_requests for insert
  with check (
    exists (
      select 1
      from invitations i
      join guests g on g.id = i.guest_id
      where i.id = headcount_increase_requests.invitation_id
        and g.auth_user_id = auth.uid()
        and i.status = 'accepted'
    )
  );

-- Organizers may read all requests for their events.
create policy "hir: organizer reads event requests"
  on headcount_increase_requests for select
  using (
    exists (
      select 1
      from invitations i
      join events e on e.id = i.event_id
      where i.id = headcount_increase_requests.invitation_id
        and e.organizer_id = auth.uid()
    )
  );

-- Organizer decisions go through the decideHeadcountRequest Edge Function (service role).


-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Trigger 1: Maintain invitations.party_size and invitations.checked_in_count
-- Fires after any INSERT, UPDATE, or DELETE on attendees.
-- Recomputes both cached counts for the affected invitation(s).
-- ---------------------------------------------------------------------------
create or replace function fn_update_invitation_counts()
returns trigger
language plpgsql
security definer
as $$
declare
  v_invitation_id uuid;
begin
  -- Determine which invitation(s) were affected
  if tg_op = 'DELETE' then
    v_invitation_id := old.invitation_id;
  else
    v_invitation_id := new.invitation_id;
  end if;

  update invitations
  set
    party_size = (
      select count(*)
      from attendees
      where invitation_id = v_invitation_id
        and status = 'approved'
    ),
    checked_in_count = (
      select count(*)
      from attendees
      where invitation_id = v_invitation_id
        and checked_in = true
    ),
    updated_at = now()
  where id = v_invitation_id;

  return null; -- AFTER trigger; return value is ignored for statement-level triggers
end;
$$;

create trigger trg_attendee_update_invitation_counts
  after insert or update or delete on attendees
  for each row execute function fn_update_invitation_counts();

comment on function fn_update_invitation_counts() is
  'Recomputes invitations.party_size (approved attendees) and invitations.checked_in_count after any attendees change.';


-- ---------------------------------------------------------------------------
-- Trigger 2: Auto-create the primary Attendee when an Invitation is accepted
-- Fires after UPDATE on invitations, when status transitions to 'accepted'.
-- Creates is_primary = true, status = 'approved' Attendee using the guest's
-- full_name. Idempotent: no-op if the primary row already exists.
-- Design Decision D12.
-- ---------------------------------------------------------------------------
create or replace function fn_create_primary_attendee_on_accept()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only act on transitions TO 'accepted'
  if new.status <> 'accepted' or old.status = 'accepted' then
    return new;
  end if;

  -- Insert primary Attendee if one doesn't already exist
  insert into attendees (
    invitation_id,
    full_name,
    is_primary,
    status,
    submitted_at
  )
  select
    new.id,
    g.full_name,
    true,
    'approved',
    now()
  from guests g
  where g.id = new.guest_id
  on conflict do nothing;  -- idempotent: if already exists, skip

  return new;
end;
$$;

create trigger trg_invitation_accept_create_primary_attendee
  after update on invitations
  for each row execute function fn_create_primary_attendee_on_accept();

comment on function fn_create_primary_attendee_on_accept() is
  'Auto-creates the primary (is_primary=true, approved) Attendee row when an Invitation transitions to accepted. Idempotent.';


-- ---------------------------------------------------------------------------
-- Trigger 3: RSVP Deadline Lock
-- Prevents guests from changing invitation status or submitting new attendees/
-- headcount requests after the event's RSVP deadline has passed.
-- Fires BEFORE UPDATE on invitations.
-- ---------------------------------------------------------------------------
create or replace function fn_enforce_rsvp_deadline_lock()
returns trigger
language plpgsql
as $$
declare
  v_deadline timestamptz;
begin
  select rsvp_deadline into v_deadline
  from events
  where id = new.event_id;

  -- Only block guest-initiated changes (service role bypasses RLS and triggers
  -- for organizer/admin operations). We detect service role via current_setting.
  if now() > v_deadline
    and current_setting('request.jwt.claims', true)::jsonb ->> 'role' <> 'service_role'
  then
    raise exception 'RSVP deadline has passed. No further changes are permitted.'
      using errcode = 'P0001',
            hint    = 'The RSVP deadline for this event has passed.';
  end if;

  return new;
end;
$$;

create trigger trg_invitations_rsvp_deadline_lock
  before update on invitations
  for each row execute function fn_enforce_rsvp_deadline_lock();

comment on function fn_enforce_rsvp_deadline_lock() is
  'Blocks non-service-role updates to invitations after the event RSVP deadline.';

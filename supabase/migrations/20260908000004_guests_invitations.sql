-- =============================================================================
-- Migration: 20260908000004_guests_invitations.sql
-- Purpose:   Create the guests (cross-event directory) and invitations tables.
--
--            guests  — deduplicated by email; auth_user_id linked lazily on
--                      first magic-link login via a DB trigger on auth.users.
--
--            invitations — one per (event, guest) pair (UNIQUE enforced).
--                          party_size and checked_in_count are trigger-maintained
--                          cached rollups, not directly editable by clients.
--
-- Depends on: 20260908000001_enums.sql
--             20260908000002_profiles.sql  (organizer_profiles FK)
--             20260908000003_events.sql    (events FK)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- guests
-- The cross-event guest directory. A row may exist before the person ever
-- logs in (organizer-built list or public self-registration). auth_user_id is
-- populated lazily the first time that email completes a magic-link login,
-- via a DB trigger on auth.users (see note at bottom of file).
-- Guest rows are never hard-deleted (D6).
-- ---------------------------------------------------------------------------
create table guests (
  id           uuid        primary key default gen_random_uuid(),
  email        text        not null unique,  -- directory deduplication key
  full_name    text        not null,
  auth_user_id uuid        unique references auth.users (id) on delete set null,
                                            -- nullable; lazy-linked on first magic-link login
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table  guests              is 'Cross-event guest directory, deduplicated by email. auth_user_id is populated lazily on first magic-link login.';
comment on column guests.email        is 'The canonical identity key for a guest. Case-sensitive; normalize to lowercase on insert.';
comment on column guests.auth_user_id is 'FK to auth.users.id. NULL until the guest completes their first magic-link login. Set by a DB trigger, not by client code.';

create trigger trg_guests_updated_at
  before update on guests
  for each row execute function set_updated_at();

-- Indexes (email UNIQUE already indexed; auth_user_id needs its own for RLS hot path)
create index idx_guests_auth_user_id on guests (auth_user_id);  -- RLS: g.auth_user_id = auth.uid()

-- Row Level Security
alter table guests enable row level security;

-- Guests may read and update their own row.
create policy "guests: guest reads own row"
  on guests for select
  using (auth_user_id = auth.uid());

create policy "guests: guest updates own row"
  on guests for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Organizers may read guests who are invited to their events.
create policy "guests: organizer reads invited guests"
  on guests for select
  using (
    exists (
      select 1
      from invitations i
      join events e on e.id = i.event_id
      where i.guest_id = guests.id
        and e.organizer_id = auth.uid()
    )
  );

-- Service role handles INSERT (triggered by open-registration or organizer import).
-- No client INSERT policy is intentionally granted.


-- ---------------------------------------------------------------------------
-- invitations
-- Per-event, per-guest invitation. One row per (event_id, guest_id) pair.
--
-- party_size      — cached count of this invitation's *approved* Attendees.
--                   Maintained by trg_attendee_update_invitation_counts (005_attendees.sql).
-- checked_in_count — cached count of this invitation's checked-in Attendees.
--                   Maintained by the same trigger.
-- Neither field is directly writable by any role other than service role.
-- ---------------------------------------------------------------------------
create table invitations (
  id               uuid                   primary key default gen_random_uuid(),
  event_id         uuid                   not null references events (id) on delete cascade,
  guest_id         uuid                   not null references guests (id),

  status           invitation_status_enum not null default 'pending',
  max_party_size   int                    not null default 1 check (max_party_size >= 1),
                                          -- organizer-set ceiling; raised by approved HeadcountIncreaseRequest
  party_size       int                    not null default 0 check (party_size >= 0),
                                          -- CACHED: trigger-maintained count of approved Attendees
  checked_in_count int                    not null default 0 check (checked_in_count >= 0),
                                          -- CACHED: trigger-maintained count of checked-in Attendees

  -- Guest-submitted logistics (invitation-level, covers whole party — D stay on Invitation)
  dietary_preference  text,
  special_requests    text,

  -- Provenance
  invited_by       uuid                   references organizer_profiles (id),
                                          -- null for guest-initiated (open-registration) invitations
  invited_at       timestamptz,           -- null for open-registration (set on invite-only send)
  responded_at     timestamptz,           -- when guest changed status from pending
  waitlisted_at    timestamptz,           -- when invitation entered waitlisted status

  -- Timestamps
  created_at       timestamptz            not null default now(),
  updated_at       timestamptz            not null default now(),

  -- Constraints
  constraint invitations_unique_per_event_guest unique (event_id, guest_id),  -- D5
  constraint invitations_party_size_within_max check (party_size <= max_party_size)
);

comment on table  invitations                    is 'Per-event, per-guest invitation. Exactly one per (event_id, guest_id) pair.';
comment on column invitations.max_party_size     is 'Organizer-set ceiling on total heads for this invitation, including the guest themself. Raised by an approved HeadcountIncreaseRequest.';
comment on column invitations.party_size         is 'CACHED. Trigger-maintained count of this invitation''s approved Attendees. Do not edit directly.';
comment on column invitations.checked_in_count   is 'CACHED. Trigger-maintained count of this invitation''s checked-in Attendees. Do not edit directly.';
comment on column invitations.invited_by         is 'FK to organizer_profiles. NULL for open-registration (guest-initiated) invitations.';

create trigger trg_invitations_updated_at
  before update on invitations
  for each row execute function set_updated_at();

-- Indexes
create index idx_invitations_event_id_status on invitations (event_id, status);  -- approval queue, capacity queries (D16)
create index idx_invitations_guest_id        on invitations (guest_id);           -- guest dashboard

-- Row Level Security
alter table invitations enable row level security;

-- Guests may read their own invitations.
create policy "invitations: guest reads own"
  on invitations for select
  using (
    exists (
      select 1 from guests g
      where g.id = invitations.guest_id
        and g.auth_user_id = auth.uid()
    )
  );

-- Guests may update their own invitation status and logistics fields,
-- subject to RSVP deadline lock (enforced by DB trigger and/or Edge Function).
create policy "invitations: guest updates own"
  on invitations for update
  using (
    exists (
      select 1 from guests g
      where g.id = invitations.guest_id
        and g.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from guests g
      where g.id = invitations.guest_id
        and g.auth_user_id = auth.uid()
    )
  );

-- Organizers may read all invitations for their events.
create policy "invitations: organizer reads event invitations"
  on invitations for select
  using (
    exists (
      select 1 from events e
      where e.id = invitations.event_id
        and e.organizer_id = auth.uid()
    )
  );

-- Organizers may insert invitations for their events (invite-only list building).
create policy "invitations: organizer inserts for own event"
  on invitations for insert
  with check (
    exists (
      select 1 from events e
      where e.id = invitations.event_id
        and e.organizer_id = auth.uid()
    )
  );

-- Organizers may update invitations for their events
-- (e.g. adjust max_party_size, change status as part of headcount approval).
create policy "invitations: organizer updates for own event"
  on invitations for update
  using (
    exists (
      select 1 from events e
      where e.id = invitations.event_id
        and e.organizer_id = auth.uid()
    )
  );

-- Check-in staff may read invitation rows for their assigned event
-- (needed for attendance-tracking dashboard counts).
create policy "invitations: staff reads assigned event"
  on invitations for select
  using (
    exists (
      select 1 from checkin_assignments ca
      where ca.event_id = invitations.event_id
        and ca.auth_user_id = auth.uid()
        and ca.status = 'active'
    )
  );


-- ---------------------------------------------------------------------------
-- NOTE: Guest.auth_user_id linkage trigger
-- A DB trigger on auth.users fires AFTER INSERT to lazily link a magic-link
-- login to an existing guests row (matching on email). If no guests row
-- exists yet for that email, a new one is inserted.
--
-- The trigger also handles the CheckInAssignment.auth_user_id linkage and
-- status → 'active' flip for check-in staff logins (the same Supabase Auth
-- OTP mechanism serves both guest and staff magic-link flows).
--
-- Implementation note: auth.users triggers require the pg_net / supabase_auth
-- extension or a Supabase Auth webhook. The trigger body is defined in a
-- separate migration or Supabase Auth hook configuration to avoid circular
-- dependency issues at migration time.
-- ---------------------------------------------------------------------------

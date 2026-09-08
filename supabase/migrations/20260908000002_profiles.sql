-- =============================================================================
-- Migration: 20260908000002_profiles.sql
-- Purpose:   Create identity tables for Organizers and Administrators.
--            Both tables use id = auth.users.id (Supabase Auth primary key)
--            as their own primary key, establishing a 1:1 relationship.
--
-- Depends on: 20260908000001_enums.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- organizer_profiles
-- One row per Event Organizer, created on first Google Sign-In.
-- status starts as 'pending' and is moved to 'active' by a System Administrator.
-- This pending→active gate is the sole trust check on who can create events.
-- ---------------------------------------------------------------------------
create table organizer_profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  email      text        not null unique,
  full_name  text        not null,
  status     organizer_status_enum not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table  organizer_profiles                is 'One row per Event Organizer, linked 1:1 to auth.users.';
comment on column organizer_profiles.id             is 'Equals auth.users.id — the Supabase Auth primary key.';
comment on column organizer_profiles.status         is 'pending = awaiting admin verification; active = may create events.';

-- Automatically keep updated_at current on any row change.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_organizer_profiles_updated_at
  before update on organizer_profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- admin_profiles
-- One row per System Administrator, provisioned directly (not self-registered).
-- Admins manage org-wide settings and organizer verification only.
-- They have no access to individual event guest lists, RSVP content, or
-- attendee data — that exclusion is enforced by RLS on all other tables.
-- ---------------------------------------------------------------------------
create table admin_profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  email      text        not null unique,
  full_name  text        not null,
  created_at timestamptz not null default now()
);

comment on table  admin_profiles           is 'One row per System Administrator, linked 1:1 to auth.users. Provisioned directly, not self-registered.';
comment on column admin_profiles.id        is 'Equals auth.users.id — the Supabase Auth primary key.';

-- =============================================================================
-- Row Level Security
-- Both tables are defined above; all policies are declared here so that
-- forward references (e.g. admin_profiles inside organizer_profiles policies)
-- are always resolved against an already-existing table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- organizer_profiles RLS
-- ---------------------------------------------------------------------------
alter table organizer_profiles enable row level security;

-- Organizers may read and update their own row only.
create policy "organizer_profiles: organizer reads own row"
  on organizer_profiles for select
  using (auth.uid() = id);

create policy "organizer_profiles: organizer updates own row"
  on organizer_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins may read all organizer profiles (for the verification queue).
-- Admin identity is checked via admin_profiles table.
create policy "organizer_profiles: admin reads all"
  on organizer_profiles for select
  using (exists (
    select 1 from admin_profiles where id = auth.uid()
  ));

-- Admins may update the status column only (verification).
-- Column-level control is enforced in the Edge Function; RLS permits the row.
create policy "organizer_profiles: admin updates status"
  on organizer_profiles for update
  using (exists (
    select 1 from admin_profiles where id = auth.uid()
  ));

-- Insert is done by the auth trigger (see note below), not by the client.
-- Service role handles the insert; no client INSERT policy is granted.

-- ---------------------------------------------------------------------------
-- admin_profiles RLS
-- ---------------------------------------------------------------------------
alter table admin_profiles enable row level security;

-- Admins may read their own row (to confirm their identity/session).
create policy "admin_profiles: admin reads own row"
  on admin_profiles for select
  using (auth.uid() = id);

-- No INSERT or UPDATE policy for clients — admins are provisioned via service role only.

-- ---------------------------------------------------------------------------
-- NOTE: organizer_profiles row creation on first Google Sign-In
-- A database trigger on auth.users fires AFTER INSERT when a new user signs in
-- via Google OAuth. It inserts a organizer_profiles row (status = 'pending')
-- using the service role — clients never INSERT directly.
-- This trigger is NOT in this migration (it requires access to auth schema
-- extensions). It should be added as a separate Supabase Auth hook or
-- via a trigger on auth.users in the Supabase dashboard / a dedicated
-- auth-extension migration.
-- ---------------------------------------------------------------------------

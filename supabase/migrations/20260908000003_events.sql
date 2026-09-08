-- =============================================================================
-- Migration: 20260908000003_events.sql
-- Purpose:   Create the events and reminder_schedules tables.
--            Events are the central entity of EIRMIS; all guest and
--            invitation data hangs off an event.
--
-- Depends on: 20260908000001_enums.sql
--             20260908000002_profiles.sql  (organizer_profiles FK)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table events (
  id               uuid                  primary key default gen_random_uuid(),
  organizer_id     uuid                  not null references organizer_profiles (id),

  -- Content
  title            text                  not null,
  slug             text                  not null unique,  -- used in /register/:slug for open_registration events
  description      text,
  cover_image_url  text,                                   -- optional cover/banner image for cards and email headers (D14)

  -- Schedule
  starts_at        timestamptz           not null,
  ends_at          timestamptz           not null,
  event_timezone   text                  not null default 'Asia/Manila', -- IANA timezone string (D9)

  -- Location — structured fields replacing a single freeform text column (D11)
  venue_name       text,
  address          text,
  city             text,
  location_url     text,                                   -- optional map/directions link

  -- Capacity & Registration
  capacity         int                   not null check (capacity > 0),
  rsvp_deadline    timestamptz           not null,
  visibility_mode  event_visibility_enum not null,
  status           event_status_enum     not null default 'draft',

  -- Soft-delete (D6) — events are never hard-deleted in v1
  deleted_at       timestamptz,

  -- Timestamps
  created_at       timestamptz           not null default now(),
  updated_at       timestamptz           not null default now(),

  -- Constraints
  constraint events_ends_after_starts check (ends_at > starts_at),
  constraint events_rsvp_before_start check (rsvp_deadline <= starts_at)
);

comment on table  events                  is 'An organizer-owned event with capacity ceiling, RSVP deadline, visibility mode, and status lifecycle.';
comment on column events.slug             is 'URL-safe identifier used in the public /register/:slug open-registration form.';
comment on column events.event_timezone   is 'IANA timezone string (e.g. Asia/Manila) used to localise reminder send times.';
comment on column events.cover_image_url  is 'Optional featured image for event cards and email headers; separate from InvitationDesign creative assets.';
comment on column events.capacity         is 'Maximum total approved Attendees across all Invitations for this event. Enforced atomically by DB trigger.';
comment on column events.deleted_at       is 'Soft-delete timestamp. NULL = active. Non-null = soft-deleted. Events are never hard-deleted.';

create trigger trg_events_updated_at
  before update on events
  for each row execute function set_updated_at();

-- Indexes
create index idx_events_organizer_id          on events (organizer_id);
create index idx_events_status_organizer_id   on events (status, organizer_id);  -- organizer event list with status filter
create index idx_events_deleted_at            on events (deleted_at) where deleted_at is null; -- active-events fast filter

-- Row Level Security
alter table events enable row level security;

-- Organizers may read their own non-deleted events.
create policy "events: organizer reads own"
  on events for select
  using (
    organizer_id = auth.uid()
    and deleted_at is null
  );

-- Organizers may insert events for themselves.
create policy "events: organizer inserts own"
  on events for insert
  with check (
    organizer_id = auth.uid()
    and exists (
      select 1 from organizer_profiles
      where id = auth.uid() and status = 'active'
    )
  );

-- Organizers may update their own events.
create policy "events: organizer updates own"
  on events for update
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

-- Public: published open-registration events are readable without auth (for /register/:slug).
-- The anon role is used here; Supabase anon key is required in the client.
create policy "events: public reads open registration published"
  on events for select
  using (
    visibility_mode = 'open_registration'
    and status = 'published'
    and deleted_at is null
  );

-- NOTE: Two further events policies are defined in later migrations, after the
-- tables they reference are created:
--
--   "events: guest reads invited published"
--     → deferred to 20260908000004_guests_invitations.sql
--       (references: invitations, guests)
--
--   "events: staff reads assigned"
--     → deferred to 20260908000006_checkin.sql
--       (references: checkin_assignments)


-- ---------------------------------------------------------------------------
-- reminder_schedules
-- Configures when scheduled reminder emails fire before an event.
-- The sendReminders Edge Function reads these rows on its pg_cron schedule.
-- ---------------------------------------------------------------------------
create table reminder_schedules (
  id                 uuid        primary key default gen_random_uuid(),
  event_id           uuid        not null references events (id) on delete cascade,
  days_before_event  int         not null check (days_before_event > 0),
  send_time_of_day   time        not null default '09:00',  -- local time in event's timezone (D9)
  enabled            boolean     not null default true,
  last_sent_at       timestamptz,                           -- set by sendReminders Edge Function after dispatch

  -- A single event cannot have two schedules for the same day-offset
  constraint reminder_schedules_unique_day unique (event_id, days_before_event)
);

comment on table  reminder_schedules                   is 'Configured scheduled-reminder offsets for an event. Consumed by the sendReminders Edge Function.';
comment on column reminder_schedules.days_before_event is 'e.g. 7 = fire 7 days before the event starts.';
comment on column reminder_schedules.send_time_of_day  is 'Local time (in event_timezone) at which the reminder fires on the target day.';
comment on column reminder_schedules.last_sent_at      is 'Timestamp of last successful dispatch by the scheduled job; null if not yet sent.';

-- Index
create index idx_reminder_schedules_event_id on reminder_schedules (event_id);

-- Row Level Security
alter table reminder_schedules enable row level security;

-- Organizers may fully manage reminder schedules for their own events.
create policy "reminder_schedules: organizer manages own event"
  on reminder_schedules for all
  using (
    exists (
      select 1 from events e
      where e.id = reminder_schedules.event_id
        and e.organizer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from events e
      where e.id = reminder_schedules.event_id
        and e.organizer_id = auth.uid()
    )
  );

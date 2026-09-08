-- =============================================================================
-- Migration: 20260908000008_email_audit.sql
-- Purpose:   Create the email_logs and audit_log_entries tables.
--
--            email_logs      — records every transactional email dispatched
--                              through Resend. Linked to event, invitation,
--                              and/or attendee for per-invitation history (D7).
--
--            audit_log_entries — immutable, append-only change/action log.
--                              All state-changing operations write here.
--                              UPDATE and DELETE are denied for all roles
--                              at the RLS level (D15).
--
-- Depends on: 20260908000001_enums.sql
--             20260908000002_profiles.sql          (organizer_profiles FK note)
--             20260908000003_events.sql            (events FK)
--             20260908000004_guests_invitations.sql (invitations FK)
--             20260908000005_attendees.sql          (attendees FK)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- email_logs
-- One row per transactional email dispatched through Resend.
-- Written by Edge Functions under service role after successful Resend API call.
-- The type column uses freeform text (not an enum) so new email types can be
-- added by deploying a new Edge Function without a schema migration.
--
-- Full type list (as of v1):
--   invitation_sent              — sent to guest when organizer adds them to invite-only list
--   rsvp_confirmation            — sent to guest on RSVP acceptance (open-registration or invite-only)
--   waitlist_promoted            — sent to guest when their waitlisted invitation is promoted
--   reminder                     — scheduled event reminder (days_before_event)
--   invitation_nudge             — nudge to tentative guests ("you haven't confirmed yet") (D3)
--   attendee_status_update       — batched approval/rejection summary to guest
--   headcount_request_submitted  — notification to organizer of a new request
--   headcount_request_decided    — decision outcome to guest
--   qr_codes_issued              — QR PDF email to guest (automatic or manual resend)
--   invitation_design_validation_failed — to organizer when HTML scan fails
--   organizer_account_verified   — to organizer when admin activates their account
-- ---------------------------------------------------------------------------
create table email_logs (
  id                  uuid                   primary key default gen_random_uuid(),

  -- Context FKs (all nullable; use whichever apply to the email type)
  event_id            uuid                   references events (id) on delete set null,
  invitation_id       uuid                   references invitations (id) on delete set null,   -- D7
  attendee_id         uuid                   references attendees (id) on delete set null,     -- D7

  -- Recipient & content
  recipient_email     text                   not null,
  type                text                   not null,  -- see type list in comment above
  provider_message_id text,                             -- Resend message ID for delivery troubleshooting

  -- Delivery status
  status              email_log_status_enum  not null default 'queued',
  sent_at             timestamptz,           -- set when status transitions to 'sent'

  created_at          timestamptz            not null default now()
);

comment on table  email_logs                    is 'Record of every transactional email dispatched through Resend. Written by Edge Functions only (service role).';
comment on column email_logs.type               is 'Email type identifier. Freeform text — no enum, so new types can be added without a migration.';
comment on column email_logs.provider_message_id is 'Resend''s message ID. Useful for delivery troubleshooting and webhook correlation.';
comment on column email_logs.invitation_id      is 'FK to invitations. Enables per-invitation email history without joining on recipient_email.';
comment on column email_logs.attendee_id        is 'FK to attendees. Set for attendee-specific emails (e.g. individual qr_codes_issued rows).';

-- Indexes (D16)
create index idx_email_logs_event_id      on email_logs (event_id);        -- per-event email history
create index idx_email_logs_invitation_id on email_logs (invitation_id);   -- per-invitation history (D7)
create index idx_email_logs_attendee_id   on email_logs (attendee_id);     -- per-attendee history (D7)

-- Row Level Security
alter table email_logs enable row level security;

-- Organizers may read email logs for their events.
create policy "email_logs: organizer reads own event logs"
  on email_logs for select
  using (
    event_id is not null
    and exists (
      select 1 from events e
      where e.id = email_logs.event_id
        and e.organizer_id = auth.uid()
    )
  );

-- Guests may read email logs for their own invitations.
create policy "email_logs: guest reads own invitation logs"
  on email_logs for select
  using (
    invitation_id is not null
    and exists (
      select 1
      from invitations i
      join guests g on g.id = i.guest_id
      where i.id = email_logs.invitation_id
        and g.auth_user_id = auth.uid()
    )
  );

-- No INSERT policy for clients — only Edge Functions (service role) write here.
-- No UPDATE or DELETE policy for anyone — email_logs are write-once records.


-- ---------------------------------------------------------------------------
-- audit_log_entries
-- Immutable, append-only log of all state-changing actions.
-- Written by Edge Functions under service role.
-- UPDATE and DELETE are denied for ALL roles at the RLS level — including
-- service role when RLS is on, which requires a separate BYPASSRLS role
-- for the Edge Function's service key (Supabase service role has BYPASSRLS
-- by default; the append-only guarantee is enforced by the RLS deny policies
-- combined with no application UPDATE/DELETE path being exposed in the contract).
--
-- actor_type enum values (D15):
--   'organizer'      — actor_id = organizer_profiles.id
--   'guest'          — actor_id = guests.id
--   'check_in_staff' — actor_id = checkin_assignments.id
--   'system'         — actor_id = null (scheduled job / automated process)
--
-- Audited actions (§6 Audit & Integrity):
--   attendee.approved                  attendee.rejected
--   attendee.approved_over_capacity    headcount_request.approved
--   headcount_request.rejected         invitation_design.uploaded
--   invitation_design.validation_failed qr.bulk_sent
--   checkin.attendee_scanned           checkin.attendee_rescanned   (D1: soft re-entry)
--   checkin_assignment.granted         checkin_assignment.revoked
--   organizer.verified
-- ---------------------------------------------------------------------------
create table audit_log_entries (
  id           uuid                    primary key default gen_random_uuid(),

  -- Actor
  actor_type   audit_actor_type_enum   not null,
  actor_id     uuid,                   -- null when actor_type = 'system'
                                       -- Points to: organizer_profiles.id | guests.id | checkin_assignments.id

  -- Action
  action       text                    not null,    -- e.g. 'attendee.approved', 'checkin.attendee_scanned'
  entity_type  text                    not null,    -- e.g. 'attendee', 'invitation', 'checkin_assignment'
  entity_id    uuid                    not null,

  -- Payload
  old_value    jsonb,                  -- state before the action (nullable)
  new_value    jsonb,                  -- state after the action (nullable)
  reason       text,                   -- organizer's optional override/decision note

  -- Timestamp (append-only; no updated_at — this row never changes)
  created_at   timestamptz             not null default now()
);

comment on table  audit_log_entries            is 'Immutable, append-only log of all audited state-changing actions. No UPDATE or DELETE permitted for any role.';
comment on column audit_log_entries.actor_type is 'organizer | guest | check_in_staff | system. Determines how to interpret actor_id.';
comment on column audit_log_entries.actor_id   is 'FK semantics: organizer_profiles.id, guests.id, or checkin_assignments.id depending on actor_type. Null for system.';
comment on column audit_log_entries.action     is 'Dot-namespaced action identifier, e.g. attendee.approved, checkin.attendee_scanned.';
comment on column audit_log_entries.entity_type is 'Name of the primary entity affected (e.g. attendee, invitation).';

-- Indexes (D16)
create index idx_audit_log_entity        on audit_log_entries (entity_type, entity_id);  -- lookup all audit events for a record
create index idx_audit_log_actor_id      on audit_log_entries (actor_id);                 -- lookup all actions by an actor
create index idx_audit_log_created_at    on audit_log_entries (created_at);               -- chronological queries

-- Row Level Security — IMMUTABILITY ENFORCEMENT
alter table audit_log_entries enable row level security;

-- Organizers may read audit entries for their events' entities.
-- (Scoped: only entries where entity_id matches an entity belonging to their events.)
-- For simplicity in v1, organizers read by actor_id matching their own profile
-- or by joining through entity lookups — the Edge Function surfaces relevant
-- entries in the approval queue; this policy covers direct table access.
create policy "audit_log_entries: organizer reads own event entries"
  on audit_log_entries for select
  using (
    -- Allow organizer to see entries where they were the actor
    (actor_type = 'organizer' and actor_id = auth.uid())
    or
    -- Allow organizer to see entries for attendees/invitations on their events
    (entity_type = 'attendee' and exists (
      select 1
      from attendees a
      join invitations i on i.id = a.invitation_id
      join events e on e.id = i.event_id
      where a.id = audit_log_entries.entity_id
        and e.organizer_id = auth.uid()
    ))
    or
    (entity_type = 'invitation' and exists (
      select 1
      from invitations i
      join events e on e.id = i.event_id
      where i.id = audit_log_entries.entity_id
        and e.organizer_id = auth.uid()
    ))
  );

-- DENY UPDATE for all authenticated roles (immutability enforcement)
create policy "audit_log_entries: deny update for all"
  on audit_log_entries for update
  using (false);  -- always false = no authenticated role can UPDATE

-- DENY DELETE for all authenticated roles (immutability enforcement)
create policy "audit_log_entries: deny delete for all"
  on audit_log_entries for delete
  using (false);  -- always false = no authenticated role can DELETE

-- INSERT is permitted for service role only (Edge Functions).
-- No authenticated client INSERT policy — the audit log is written server-side.

-- ---------------------------------------------------------------------------
-- NOTE on append-only guarantee:
-- RLS with `using (false)` on UPDATE and DELETE prevents any authenticated
-- JWT from modifying or removing rows. The Supabase service role (used by
-- Edge Functions) has BYPASSRLS by default — but our Edge Functions
-- intentionally do NOT expose an update or delete operation on this table,
-- so the only write path is INSERT via the service role. This is a defence-
-- in-depth guarantee: RLS blocks clients; the contract blocks the frontend;
-- and Edge Function code is the only INSERT path.
-- ---------------------------------------------------------------------------

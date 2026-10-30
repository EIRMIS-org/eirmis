-- =============================================================================
-- Migration: 20260920000000_org_settings.sql
-- Purpose:   Create the org_settings singleton table, enforce singleton pattern
--            via unique expression index, seed default row, and establish
--            admin-only RLS policies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- org_settings table
-- ---------------------------------------------------------------------------
create table org_settings (
  id                             uuid        primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  org_name                       text        not null default 'EIRMIS Enterprise Cloud Platform',
  default_timezone               text        not null default 'Asia/Manila',
  default_capacity_ceiling       integer     not null default 150 check (default_capacity_ceiling > 0),
  sender_domain                  text        not null default 'invites.eirmis.org',
  malware_sandbox_enabled        boolean     not null default true,
  self_registration_gate_enabled boolean     not null default true,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);

comment on table  org_settings                             is 'Singleton table holding organization-wide settings and security defaults.';
comment on column org_settings.id                          is 'Fixed singleton primary key.';
comment on column org_settings.org_name                    is 'Organization or instance display name.';
comment on column org_settings.default_timezone            is 'Default timezone for new events and calendar exports.';
comment on column org_settings.default_capacity_ceiling    is 'Default capacity ceiling applied to new events.';
comment on column org_settings.sender_domain               is 'Verified sender domain used for invitation and notification emails.';
comment on column org_settings.malware_sandbox_enabled     is 'Whether custom HTML invitations require a clean scan before serving.';
comment on column org_settings.self_registration_gate_enabled is 'Whether new organizers require admin activation before creating events.';

-- Enforce exactly one row via unique index
create unique index org_settings_singleton_idx on org_settings ((true));

-- Keep updated_at current on any row change
create trigger trg_org_settings_updated_at
  before update on org_settings
  for each row execute function set_updated_at();

-- Seed initial default singleton row
insert into org_settings (
  id,
  org_name,
  default_timezone,
  default_capacity_ceiling,
  sender_domain,
  malware_sandbox_enabled,
  self_registration_gate_enabled
) values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'EIRMIS Enterprise Cloud Platform',
  'Asia/Manila',
  150,
  'invites.eirmis.org',
  true,
  true
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table org_settings enable row level security;

-- Admins only may read organization settings
create policy "org_settings: admin reads settings"
  on org_settings for select
  using (exists (
    select 1 from admin_profiles where id = auth.uid()
  ));

-- Admins only may update organization settings
create policy "org_settings: admin updates settings"
  on org_settings for update
  using (exists (
    select 1 from admin_profiles where id = auth.uid()
  ))
  with check (exists (
    select 1 from admin_profiles where id = auth.uid()
  ));

-- No client INSERT or DELETE policy granted (singleton managed in migration)


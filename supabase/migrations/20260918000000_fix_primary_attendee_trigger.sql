-- =============================================================================
-- Migration: 20260918000000_fix_primary_attendee_trigger.sql
-- Purpose:   Extend the primary attendee auto-creation trigger to fire on
--            INSERT as well as UPDATE. This ensures that open-registration
--            invitations (which are created directly with status = 'accepted')
--            also get their primary attendee row auto-created.
-- =============================================================================

create or replace function fn_create_primary_attendee_on_accept()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only act on transitions TO 'accepted' or inserts with 'accepted'
  if new.status <> 'accepted' then
    return new;
  end if;
  
  if TG_OP = 'UPDATE' and old.status = 'accepted' then
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

drop trigger if exists trg_invitation_accept_create_primary_attendee on invitations;

create trigger trg_invitation_accept_create_primary_attendee
  after insert or update on invitations
  for each row execute function fn_create_primary_attendee_on_accept();

comment on function fn_create_primary_attendee_on_accept() is
  'Auto-creates the primary (is_primary=true, approved) Attendee row when an Invitation transitions to accepted or is inserted as accepted. Idempotent.';

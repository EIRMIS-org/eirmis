-- =============================================================================
-- Migration: 20260918000001_auth_linkage_triggers.sql
-- Purpose:   Implements the auth linkage triggers for organizers, guests, and
--            check-in staff.
--            1. Organizer: inserts into organizer_profiles on first Google Sign-In.
--            2. Guest/Staff: links auth_user_id on magic-link login based on email.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text;
  v_email text;
  v_name text;
begin
  v_provider := new.raw_app_meta_data->>'provider';
  v_email := new.email;
  v_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(v_email, '@', 1));

  if v_provider = 'google' then
    -- Organizer: create profile if not exists
    insert into public.organizer_profiles (id, email, full_name, status)
    values (new.id, v_email, v_name, 'pending')
    on conflict (id) do nothing;
  
  elsif v_provider = 'email' then
    -- Guest/Staff: magic-link login. We link by email.
    
    -- 1. Link Guest row, or create if not exists
    insert into public.guests (email, full_name, auth_user_id)
    values (v_email, v_name, new.id)
    on conflict (email) do update
    set auth_user_id = new.id
    where public.guests.auth_user_id is null;

    -- 2. Link CheckInAssignment rows and activate them
    update public.checkin_assignments
    set auth_user_id = new.id, status = 'active'
    where staff_email = v_email and status = 'invited';
    
  end if;

  return new;
end;
$$;

-- Drop trigger if it already exists
drop trigger if exists trg_on_auth_user_created on auth.users;

-- Recreate the trigger
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on function public.handle_new_user() is
  'Auth trigger to provision organizer profiles and link guest/staff rows upon login.';

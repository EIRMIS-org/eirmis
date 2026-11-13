create or replace function public.fn_create_primary_attendee_on_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'accepted' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'accepted' then
    return new;
  end if;

  if exists (
    select 1
    from public.attendees a
    where a.invitation_id = new.id
      and a.is_primary = true
  ) then
    return new;
  end if;

  insert into public.attendees (
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
  from public.guests g
  where g.id = new.guest_id
  on conflict do nothing;

  return new;
end;
$$;

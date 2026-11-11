-- Atomically promote the next waitlisted invitations while honoring party-size headroom.
create or replace function public.promote_waitlist_atomic(
  p_event_id uuid,
  p_headroom integer,
  p_max_promote integer default 10
)
returns table (
  id uuid,
  event_id uuid,
  status text,
  waitlisted_at timestamptz,
  party_size integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  v_limit := greatest(least(coalesce(p_max_promote, 10), coalesce(p_headroom, 0)), 0);

  if v_limit <= 0 then
    return;
  end if;

  return query
  with ranked as (
    select i.id,
           i.event_id,
           i.party_size,
           i.waitlisted_at,
           sum(i.party_size) over (
             order by i.waitlisted_at asc nulls last, i.id asc
             rows between unbounded preceding and current row
           ) as running_party_size
    from public.invitations i
    where i.event_id = p_event_id
      and i.status = 'waitlisted'
      and i.waitlisted_at is not null
  ),
  locked as (
    select r.id
    from ranked r
    where r.running_party_size <= p_headroom
    order by r.waitlisted_at asc nulls last, r.id asc
    limit v_limit
    for update skip locked
  )
  update public.invitations i
  set status = 'accepted',
      responded_at = now()
  from locked
  where i.id = locked.id
  returning i.id, i.event_id, i.status, i.waitlisted_at, i.party_size;
end;
$$;

revoke all on function public.promote_waitlist_atomic(uuid, integer, integer) from public;

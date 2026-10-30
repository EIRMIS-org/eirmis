-- Atomically reserve the next waitlisted invitations for the promotion function.
create or replace function public.promote_waitlist_fifo(
  p_event_id uuid,
  p_max_promotions integer default 1
)
returns table (id uuid, event_id uuid, guest_id uuid)
language sql
security definer
set search_path = public
as $$
  with locked as (
    select i.id
    from public.invitations i
    where i.event_id = p_event_id
      and i.status = 'waitlisted'
      and i.waitlisted_at is not null
    order by i.waitlisted_at asc
    limit greatest(p_max_promotions, 1)
    for update skip locked
  )
  update public.invitations i
  set status = 'accepted',
      responded_at = now()
  from locked
  where i.id = locked.id
  returning i.id, i.event_id, i.guest_id;
$$;

revoke all on function public.promote_waitlist_fifo(uuid, integer) from public;

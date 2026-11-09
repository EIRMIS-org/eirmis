-- Record the attendee mutation, audit entry, count, and broadcast in one transaction.
create or replace function public.record_attendee_check_in(
  p_attendee_id uuid,
  p_event_id uuid,
  p_auth_user_id uuid,
  p_actor_type audit_actor_type_enum,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  v_attendee attendees%rowtype;
  v_checked_in_at timestamptz;
  v_total_checked_in integer;
  v_result text;
begin
  -- Serialize scans for the same event before reading attendance. A later
  -- scan then counts all earlier committed check-ins, across invitations.
  perform 1 from public.events where id = p_event_id for no key update;

  select a.* into v_attendee
  from attendees a
  join invitations i on i.id = a.invitation_id
  where a.id = p_attendee_id
    and i.event_id = p_event_id
    and a.status = 'approved'
  for update of a;

  if not found then
    raise exception 'Approved attendee does not belong to this event.' using errcode = 'P0001';
  end if;

  if v_attendee.checked_in then
    v_result := 'already_checked_in';
    v_checked_in_at := v_attendee.checked_in_at;
  else
    v_result := 'accepted';
    v_checked_in_at := clock_timestamp();
    update attendees
    set checked_in = true, checked_in_at = v_checked_in_at, checked_in_by = p_auth_user_id
    where id = p_attendee_id
    returning * into v_attendee;
  end if;

  insert into audit_log_entries (
    actor_type, actor_id, action, entity_type, entity_id, old_value, new_value
  ) values (
    p_actor_type,
    p_actor_id,
    case when v_result = 'accepted'
      then 'checkin.attendee_scanned'
      else 'checkin.attendee_rescanned'
    end,
    'attendee',
    p_attendee_id,
    jsonb_build_object('checked_in', v_result = 'already_checked_in'),
    jsonb_build_object('checked_in', true, 'checked_in_at', v_checked_in_at)
  );

  select count(*)::integer into v_total_checked_in
  from attendees a
  join invitations i on i.id = a.invitation_id
  where i.event_id = p_event_id and a.checked_in = true;

  if v_result = 'accepted' then
    perform realtime.send(
      payload => jsonb_build_object(
        'attendee_id', v_attendee.id,
        'attendee_name', v_attendee.full_name,
        'scanned_at', v_checked_in_at,
        'scanned_by', p_auth_user_id,
        'total_checked_in', v_total_checked_in
      ),
      event => 'check-in',
      topic => 'broadcast:attendance:' || p_event_id::text,
      private => true
    );
  end if;

  return jsonb_build_object(
    'result', v_result,
    'attendee', to_jsonb(v_attendee),
    'checked_in_at', v_checked_in_at,
    'total_checked_in', v_total_checked_in
  );
end;
$$;

revoke all on function public.record_attendee_check_in(uuid, uuid, uuid, audit_actor_type_enum, uuid) from public, anon, authenticated;
grant execute on function public.record_attendee_check_in(uuid, uuid, uuid, audit_actor_type_enum, uuid) to service_role;

-- Only the owning organizer or assigned staff can subscribe to an event topic.
create policy "event team receives private attendance broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (select realtime.topic()) like 'broadcast:attendance:%'
  and exists (
    select 1 from public.events e
    where e.id::text = substring((select realtime.topic()) from 22)
      and (
        e.organizer_id = (select auth.uid())
        or exists (
          select 1 from public.checkin_assignments ca
          where ca.event_id = e.id
            and ca.auth_user_id = (select auth.uid())
            and ca.status = 'active'
        )
      )
  )
);

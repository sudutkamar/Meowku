-- Permanent schedule deletion is an explicit owner/admin action from the UI.
-- Child occurrences/targets/slots are removed by their existing ON DELETE CASCADE
-- constraints; the deletion itself remains visible in the immutable audit log.
create or replace function public.delete_schedule(schedule_id_value uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  schedule_row public.schedules;
  occurrence_count integer;
begin
  select s.* into schedule_row
  from public.schedules s
  where s.id = schedule_id_value
    and public.household_role(s.household_id) in ('owner', 'admin')
  for update;

  if schedule_row.id is null then
    raise exception 'schedule_not_found_or_forbidden';
  end if;

  select count(*)::integer into occurrence_count
  from public.schedule_occurrences
  where schedule_id = schedule_id_value;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    schedule_row.household_id,
    auth.uid(),
    'deleted',
    'schedule',
    schedule_row.id,
    jsonb_build_object('title', schedule_row.title, 'status', schedule_row.status, 'occurrence_count', occurrence_count, 'permanent', true)
  );

  delete from public.schedules where id = schedule_id_value;
  return true;
end;
$$;

grant execute on function public.delete_schedule(uuid) to authenticated;

create or replace function public.restore_schedule(schedule_id_value uuid)
returns public.schedules language plpgsql security definer set search_path = public as $$
declare result public.schedules;
begin
  update public.schedules s
  set status = 'active', is_active = true, updated_at = now()
  where s.id = schedule_id_value
    and public.household_role(s.household_id) in ('owner', 'admin')
    and s.status = 'archived'
  returning s.* into result;
  if result.id is null then raise exception 'schedule_not_found_or_forbidden'; end if;
  update public.schedule_occurrences
  set archived_at = null
  where schedule_id = schedule_id_value
    and completed_at is null
    and archived_at is not null;
  perform public.generate_schedule_occurrences(result.household_id, result.start_date, coalesce(result.end_date, result.start_date));
  return result;
end;
$$;

grant execute on function public.restore_schedule(uuid) to authenticated;

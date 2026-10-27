-- Stabilize the schedule contract after the legacy and household migrations.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'schedules_valid_range') then
    alter table public.schedules add constraint schedules_valid_range
      check (end_date is null or start_date is null or end_date >= start_date);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'schedules_repeat_interval_positive') then
    alter table public.schedules add constraint schedules_repeat_interval_positive check (repeat_interval > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'schedules_repeat_unit_valid') then
    alter table public.schedules add constraint schedules_repeat_unit_valid check (repeat_unit in ('day', 'week', 'month'));
  end if;
end $$;

create index if not exists schedule_occurrences_replay_idx
  on public.schedule_occurrences(schedule_id, target_key, local_date);

drop policy if exists schedules_member on public.schedules;
create policy schedules_member on public.schedules
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and owner_id = auth.uid());

create or replace function public.create_schedule(
  title_value text,
  category_value text,
  scheduled_at_value timestamptz,
  household_id_value uuid,
  start_date_value date,
  end_date_value date default null,
  repeat_interval_value integer default 1,
  repeat_unit_value text default 'day',
  timezone_value text default 'Asia/Jakarta'
) returns public.schedules
language plpgsql security invoker set search_path = public as $$
declare created public.schedules;
begin
  if not public.is_household_member(household_id_value) then
    raise exception 'household_access_denied';
  end if;
  if nullif(trim(title_value), '') is null then raise exception 'invalid_schedule_title'; end if;
  if category_value not in ('feeding', 'litter', 'medicine', 'other') then raise exception 'invalid_schedule_category'; end if;
  if repeat_interval_value < 1 or repeat_unit_value not in ('day', 'week', 'month') then raise exception 'invalid_schedule_recurrence'; end if;
  if end_date_value is not null and end_date_value < start_date_value then raise exception 'invalid_schedule_range'; end if;

  insert into public.schedules (
    title, category, scheduled_at, household_id, owner_id, start_date, end_date,
    repeat_interval, repeat_unit, timezone
  ) values (
    trim(title_value), category_value, scheduled_at_value, household_id_value, auth.uid(),
    start_date_value, end_date_value, repeat_interval_value, repeat_unit_value,
    coalesce(nullif(trim(timezone_value), ''), 'Asia/Jakarta')
  ) returning * into created;
  return created;
end;
$$;

grant execute on function public.create_schedule(text, text, timestamptz, uuid, date, date, integer, text, text) to authenticated;

create or replace function public.complete_occurrence(
  occurrence_id uuid,
  completed_at_value timestamptz default now(),
  note_value text default ''
) returns public.schedule_occurrences
language plpgsql security invoker set search_path = public as $$
declare occurrence public.schedule_occurrences;
begin
  select o.* into occurrence
  from public.schedule_occurrences o
  where o.id = occurrence_id and public.is_household_member(o.household_id)
  for update;
  if occurrence.id is null then raise exception 'occurrence_not_found'; end if;
  if occurrence.completed_at is not null then return occurrence; end if;

  update public.schedule_occurrences o
  set completed_at = completed_at_value, completed_by = auth.uid(), note = coalesce(note_value, '')
  where o.id = occurrence_id and o.completed_at is null
  returning o.* into occurrence;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (occurrence.household_id, auth.uid(), 'completed', 'schedule_occurrence', occurrence.id,
    jsonb_build_object('schedule_id', occurrence.schedule_id, 'target_key', occurrence.target_key, 'note', occurrence.note));
  return occurrence;
end;
$$;

grant execute on function public.complete_occurrence(uuid, timestamptz, text) to authenticated;

-- Schedule lifecycle: archive by default, preserve all historical rows, and keep writes server-authorized.
alter table public.schedule_occurrences add column if not exists archived_at timestamptz;
alter table public.schedule_occurrences add column if not exists archived_by uuid references auth.users(id);

create index if not exists schedule_occurrences_visible_idx
  on public.schedule_occurrences(household_id, local_date)
  where archived_at is null;

drop policy if exists schedules_member on public.schedules;
create policy schedules_member_select on public.schedules
  for select using (public.is_household_member(household_id));

drop policy if exists schedule_occurrences_member on public.schedule_occurrences;
create policy schedule_occurrences_member_select on public.schedule_occurrences
  for select using (public.is_household_member(household_id));

drop policy if exists schedule_targets_member on public.schedule_targets;
create policy schedule_targets_member_select on public.schedule_targets
  for select using (exists (
    select 1 from public.schedules s
    where s.id = schedule_id and public.is_household_member(s.household_id)
  ));

create or replace function public.generate_schedule_occurrences(
  requested_household_id uuid,
  range_start date,
  range_end date
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  inserted_count integer := 0;
begin
  if auth.uid() is null or not public.is_household_member(requested_household_id) then
    raise exception 'household_access_denied';
  end if;
  if range_end < range_start or range_end - range_start > 3660 then
    raise exception 'invalid_date_range';
  end if;

  insert into public.schedule_occurrences (
    schedule_id, household_id, target_key, local_date, scheduled_at
  )
  select
    s.id,
    s.household_id,
    coalesce(t.target_key, 'household'),
    d.local_date::date,
    (
      d.local_date::date::text || ' ' ||
      to_char(s.scheduled_at at time zone coalesce(nullif(s.timezone, ''), 'Asia/Jakarta'), 'HH24:MI:SS')
    )::timestamp at time zone coalesce(nullif(s.timezone, ''), 'Asia/Jakarta')
  from public.schedules s
  left join public.schedule_targets t on t.schedule_id = s.id
  cross join lateral generate_series(range_start, range_end, interval '1 day') as d(local_date)
  where s.household_id = requested_household_id
    and s.is_active
    and d.local_date::date >= coalesce(s.start_date, d.local_date::date)
    and d.local_date::date <= coalesce(s.end_date, d.local_date::date)
    and (
      (s.repeat_unit = 'day' and mod((d.local_date::date - coalesce(s.start_date, d.local_date::date)), s.repeat_interval) = 0)
      or (
        s.repeat_unit = 'week'
        and mod((d.local_date::date - coalesce(s.start_date, d.local_date::date)) / 7, s.repeat_interval) = 0
        and (cardinality(s.days_of_week) = 0 or extract(dow from d.local_date::date)::smallint = any(s.days_of_week))
      )
      or (
        s.repeat_unit = 'month'
        and extract(day from d.local_date::date) = extract(day from coalesce(s.start_date, d.local_date::date))
        and mod(
          (extract(year from d.local_date::date)::integer * 12 + extract(month from d.local_date::date)::integer)
          - (extract(year from coalesce(s.start_date, d.local_date::date))::integer * 12 + extract(month from coalesce(s.start_date, d.local_date::date))::integer),
          s.repeat_interval
        ) = 0
      )
    )
  on conflict (schedule_id, target_key, local_date) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

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
language plpgsql security definer set search_path = public as $$
declare
  created public.schedules;
begin
  if auth.uid() is null or not public.is_household_member(household_id_value) then
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

  perform public.generate_schedule_occurrences(
    created.household_id,
    created.start_date,
    coalesce(created.end_date, created.start_date)
  );
  return created;
end;
$$;

create or replace function public.archive_schedule(schedule_id_value uuid)
returns public.schedules
language plpgsql security definer set search_path = public as $$
declare
  archived public.schedules;
begin
  select s.* into archived from public.schedules s
  where s.id = schedule_id_value
    and public.household_role(s.household_id) in ('owner', 'admin')
  for update;
  if archived.id is null then raise exception 'schedule_not_found_or_forbidden'; end if;

  update public.schedules
  set is_active = false, updated_at = now()
  where id = schedule_id_value
  returning * into archived;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (archived.household_id, auth.uid(), 'archived', 'schedule', archived.id, jsonb_build_object('title', archived.title));
  return archived;
end;
$$;

create or replace function public.delete_schedule(schedule_id_value uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  schedule_row public.schedules;
begin
  select s.* into schedule_row from public.schedules s
  where s.id = schedule_id_value
    and public.household_role(s.household_id) in ('owner', 'admin')
  for update;
  if schedule_row.id is null then raise exception 'schedule_not_found_or_forbidden'; end if;
  if exists (select 1 from public.schedule_occurrences where schedule_id = schedule_id_value) then
    raise exception 'schedule_has_history_archive_instead';
  end if;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (schedule_row.household_id, auth.uid(), 'deleted', 'schedule', schedule_row.id, jsonb_build_object('title', schedule_row.title));
  delete from public.schedules where id = schedule_id_value;
  return true;
end;
$$;

create or replace function public.archive_occurrence(occurrence_id_value uuid)
returns public.schedule_occurrences
language plpgsql security definer set search_path = public as $$
declare
  archived public.schedule_occurrences;
begin
  select o.* into archived from public.schedule_occurrences o
  where o.id = occurrence_id_value and public.is_household_member(o.household_id)
  for update;
  if archived.id is null then raise exception 'occurrence_not_found'; end if;
  if archived.completed_at is not null then raise exception 'completed_occurrence_cannot_be_archived'; end if;
  if archived.archived_at is not null then return archived; end if;

  update public.schedule_occurrences
  set archived_at = now(), archived_by = auth.uid()
  where id = occurrence_id_value
  returning * into archived;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (archived.household_id, auth.uid(), 'archived', 'schedule_occurrence', archived.id,
    jsonb_build_object('schedule_id', archived.schedule_id, 'local_date', archived.local_date));
  return archived;
end;
$$;

create or replace function public.complete_occurrence(
  occurrence_id uuid,
  completed_at_value timestamptz default now(),
  note_value text default ''
) returns public.schedule_occurrences
language plpgsql security definer set search_path = public as $$
declare
  occurrence public.schedule_occurrences;
begin
  select o.* into occurrence
  from public.schedule_occurrences o
  where o.id = occurrence_id and public.is_household_member(o.household_id)
  for update;
  if occurrence.id is null then raise exception 'occurrence_not_found'; end if;
  if occurrence.archived_at is not null then raise exception 'archived_occurrence_cannot_be_completed'; end if;
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

grant execute on function public.generate_schedule_occurrences(uuid, date, date) to authenticated;
grant execute on function public.create_schedule(text, text, timestamptz, uuid, date, date, integer, text, text) to authenticated;
grant execute on function public.archive_schedule(uuid) to authenticated;
grant execute on function public.delete_schedule(uuid) to authenticated;
grant execute on function public.archive_occurrence(uuid) to authenticated;
grant execute on function public.complete_occurrence(uuid, timestamptz, text) to authenticated;

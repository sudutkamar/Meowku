-- Schedule backend overhaul. This migration is additive and keeps legacy columns/history.

alter table public.schedules add column if not exists status text not null default 'active';
alter table public.schedules add column if not exists day_of_month smallint;
alter table public.schedules add column if not exists last_day boolean not null default false;
alter table public.schedule_targets add column if not exists is_active boolean not null default true;
alter table public.schedule_occurrences add column if not exists slot_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'schedules_status_valid') then
    alter table public.schedules add constraint schedules_status_valid check (status in ('active', 'paused', 'archived'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'schedules_month_day_valid') then
    alter table public.schedules add constraint schedules_month_day_valid check (day_of_month is null or day_of_month between 1 and 31);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'schedule_targets_target_kind_valid') then
    alter table public.schedule_targets add constraint schedule_targets_target_kind_valid
      check ((cat_id is not null and litter_box_id is null) or (cat_id is null and litter_box_id is not null) or target_key = 'household');
  end if;
end $$;

update public.schedules
set status = case when is_active then 'active' else 'archived' end
where status is null or status not in ('active', 'paused', 'archived');

-- Legacy schedules used PostgreSQL DOW (0..6). New weekly rules use ISO weekdays (1..7).
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'schedules_days_of_week_valid') then
    alter table public.schedules drop constraint schedules_days_of_week_valid;
  end if;
end $$;
update public.schedules
set days_of_week = array(
  select distinct case when day_value = 0 then 7 else day_value end
  from unnest(days_of_week) as day_value
  order by 1
)
where days_of_week && array[0]::smallint[];
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'schedules_days_of_week_iso_valid') then
    alter table public.schedules add constraint schedules_days_of_week_iso_valid check (days_of_week <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]);
  end if;
end $$;

create table if not exists public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 120),
  local_time time not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, sort_order)
);

-- Every legacy schedule gets one stable slot before occurrence.slot_id becomes required.
insert into public.schedule_slots (schedule_id, label, local_time, sort_order)
select s.id, s.title, (s.scheduled_at at time zone coalesce(nullif(s.timezone, ''), 'Asia/Jakarta'))::time, 0
from public.schedules s
where not exists (select 1 from public.schedule_slots slot where slot.schedule_id = s.id);

update public.schedule_occurrences o
set slot_id = slot.id
from public.schedule_slots slot
where slot.schedule_id = o.schedule_id and o.slot_id is null;

do $$
declare constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  where c.conrelid = 'public.schedule_occurrences'::regclass
    and c.contype = 'u'
    and pg_get_constraintdef(c.oid) like '%(schedule_id, target_key, local_date)%';
  if constraint_name is not null then
    execute format('alter table public.schedule_occurrences drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.schedule_occurrences
  add constraint schedule_occurrences_slot_fk foreign key (slot_id) references public.schedule_slots(id);
alter table public.schedule_occurrences alter column slot_id set not null;
alter table public.schedule_occurrences
  add constraint schedule_occurrences_schedule_target_date_slot_key unique (schedule_id, target_key, local_date, slot_id);

create index if not exists schedule_slots_schedule_order_idx on public.schedule_slots(schedule_id, sort_order);
create index if not exists schedule_occurrences_slot_idx on public.schedule_occurrences(schedule_id, slot_id, local_date);

alter table public.schedule_slots enable row level security;
drop policy if exists schedule_slots_member_select on public.schedule_slots;
create policy schedule_slots_member_select on public.schedule_slots
  for select using (exists (
    select 1 from public.schedules s
    where s.id = schedule_id and public.is_household_member(s.household_id)
  ));

create or replace function public.validate_schedule_target()
returns trigger language plpgsql security definer set search_path = public as $$
declare schedule_household uuid; target_household uuid;
begin
  if new.target_key = 'household' then
    if new.cat_id is not null or new.litter_box_id is not null then raise exception 'invalid_household_target'; end if;
    return new;
  end if;
  if (new.cat_id is null) = (new.litter_box_id is null) then raise exception 'exactly_one_target_required'; end if;
  select household_id into schedule_household from public.schedules where id = new.schedule_id;
  if schedule_household is null then raise exception 'schedule_not_found'; end if;
  if new.cat_id is not null then
    select household_id into target_household from public.cats where id = new.cat_id and is_active;
  else
    select household_id into target_household from public.litter_boxes where id = new.litter_box_id and is_active;
  end if;
  if target_household is null or target_household <> schedule_household then raise exception 'target_household_mismatch'; end if;
  return new;
end;
$$;
drop trigger if exists schedule_targets_validate on public.schedule_targets;
create trigger schedule_targets_validate before insert or update on public.schedule_targets
for each row execute function public.validate_schedule_target();

create or replace function public.schedule_is_due(schedule_row public.schedules, candidate_date date)
returns boolean language sql immutable as $$
  select
    candidate_date >= coalesce(schedule_row.start_date, candidate_date)
    and candidate_date <= coalesce(schedule_row.end_date, candidate_date)
    and (
      (schedule_row.repeat_unit = 'day' and mod(candidate_date - coalesce(schedule_row.start_date, candidate_date), schedule_row.repeat_interval) = 0)
      or (schedule_row.repeat_unit = 'week'
        and mod((candidate_date - coalesce(schedule_row.start_date, candidate_date)) / 7, schedule_row.repeat_interval) = 0
        and (cardinality(schedule_row.days_of_week) = 0 or extract(isodow from candidate_date)::smallint = any(schedule_row.days_of_week)))
      or (schedule_row.repeat_unit = 'month'
        and mod((extract(year from candidate_date)::integer * 12 + extract(month from candidate_date)::integer)
          - (extract(year from coalesce(schedule_row.start_date, candidate_date))::integer * 12 + extract(month from coalesce(schedule_row.start_date, candidate_date))::integer), schedule_row.repeat_interval) = 0
        and case
          when schedule_row.last_day then candidate_date = (date_trunc('month', candidate_date) + interval '1 month - 1 day')::date
          else extract(day from candidate_date)::smallint = coalesce(schedule_row.day_of_month, extract(day from coalesce(schedule_row.start_date, candidate_date))::smallint)
        end)
    );
$$;

create or replace function public.generate_schedule_occurrences(
  requested_household_id uuid, range_start date, range_end date
) returns integer language plpgsql security definer set search_path = public as $$
declare inserted_count integer := 0;
begin
  if auth.uid() is null or not public.is_household_member(requested_household_id) then raise exception 'household_access_denied'; end if;
  if range_end < range_start or range_end - range_start > 3660 then raise exception 'invalid_date_range'; end if;

  insert into public.schedule_occurrences (schedule_id, household_id, target_key, slot_id, local_date, scheduled_at)
  select s.id, s.household_id, coalesce(t.target_key, 'household'), slot.id, d.local_date::date,
    ((d.local_date::date::text || ' ' || slot.local_time::text)::timestamp at time zone coalesce(nullif(s.timezone, ''), 'Asia/Jakarta'))
  from public.schedules s
  join public.schedule_slots slot on slot.schedule_id = s.id and slot.is_active
  left join public.schedule_targets t on t.schedule_id = s.id and t.is_active
  cross join lateral generate_series(range_start, range_end, interval '1 day') as d(local_date)
  where s.household_id = requested_household_id and s.status = 'active' and s.is_active
    and public.schedule_is_due(s, d.local_date::date)
  on conflict (schedule_id, target_key, local_date, slot_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.create_schedule(
  title_value text, category_value text, scheduled_at_value timestamptz, household_id_value uuid,
  start_date_value date, end_date_value date, repeat_interval_value integer, repeat_unit_value text,
  timezone_value text, days_of_week_value smallint[], day_of_month_value smallint,
  last_day_value boolean, slots_value jsonb, targets_value jsonb
) returns public.schedules language plpgsql security definer set search_path = public as $$
declare created public.schedules; slot_record jsonb; target_record jsonb; slot_id_value uuid;
begin
  if auth.uid() is null then raise exception 'schedule_admin_required'; end if;
  if public.household_role(household_id_value) not in ('owner', 'admin') then raise exception 'schedule_admin_required'; end if;
  if nullif(trim(title_value), '') is null then raise exception 'invalid_schedule_title'; end if;
  if category_value not in ('feeding', 'litter', 'medicine', 'other') then raise exception 'invalid_schedule_category'; end if;
  if repeat_interval_value < 1 or repeat_unit_value not in ('day', 'week', 'month') then raise exception 'invalid_schedule_recurrence'; end if;
  if end_date_value is not null and end_date_value < start_date_value then raise exception 'invalid_schedule_range'; end if;
  if day_of_month_value is not null and (day_of_month_value < 1 or day_of_month_value > 31) then raise exception 'invalid_month_day'; end if;

  insert into public.schedules (title, category, scheduled_at, household_id, owner_id, start_date, end_date, repeat_interval, repeat_unit, days_of_week, timezone, day_of_month, last_day, status, is_active)
  values (trim(title_value), category_value, scheduled_at_value, household_id_value, auth.uid(), start_date_value, end_date_value, repeat_interval_value, repeat_unit_value, coalesce(days_of_week_value, '{}'), coalesce(nullif(trim(timezone_value), ''), 'Asia/Jakarta'), day_of_month_value, coalesce(last_day_value, false), 'active', true)
  returning * into created;

  for slot_record in select value from jsonb_array_elements(coalesce(nullif(slots_value, '[]'::jsonb), jsonb_build_array(jsonb_build_object('label', title_value, 'local_time', to_char(scheduled_at_value at time zone coalesce(nullif(trim(timezone_value), ''), 'Asia/Jakarta'), 'HH24:MI:SS'), 'sort_order', 0, 'is_active', true)))) loop
    insert into public.schedule_slots (schedule_id, label, local_time, sort_order, is_active)
    values (created.id, trim(slot_record->>'label'), (slot_record->>'local_time')::time, coalesce((slot_record->>'sort_order')::integer, 0), coalesce((slot_record->>'is_active')::boolean, true))
    returning id into slot_id_value;
  end loop;
  for target_record in select value from jsonb_array_elements(coalesce(targets_value, '[]'::jsonb)) loop
    insert into public.schedule_targets (schedule_id, target_key, cat_id, litter_box_id)
    values (created.id, target_record->>'target_key', nullif(target_record->>'cat_id', '')::uuid, nullif(target_record->>'litter_box_id', '')::uuid);
  end loop;
  perform public.generate_schedule_occurrences(created.household_id, created.start_date, coalesce(created.end_date, created.start_date));
  return created;
end;
$$;

create or replace function public.pause_schedule(schedule_id_value uuid)
returns public.schedules language plpgsql security definer set search_path = public as $$
declare result public.schedules;
begin
  update public.schedules s set status = 'paused', is_active = false, updated_at = now()
  where s.id = schedule_id_value and public.household_role(s.household_id) in ('owner', 'admin') and s.status <> 'archived'
  returning s.* into result;
  if result.id is null then raise exception 'schedule_not_found_or_forbidden'; end if;
  return result;
end;
$$;

create or replace function public.resume_schedule(schedule_id_value uuid)
returns public.schedules language plpgsql security definer set search_path = public as $$
declare result public.schedules;
begin
  update public.schedules s set status = 'active', is_active = true, updated_at = now()
  where s.id = schedule_id_value and public.household_role(s.household_id) in ('owner', 'admin') and s.status = 'paused'
  returning s.* into result;
  if result.id is null then raise exception 'schedule_not_found_or_forbidden'; end if;
  return result;
end;
$$;

create or replace function public.update_schedule_definition(schedule_id_value uuid, definition_value jsonb)
returns public.schedules language plpgsql security definer set search_path = public as $$
declare result public.schedules; slot_record jsonb; target_record jsonb;
begin
  select s.* into result from public.schedules s where s.id = schedule_id_value and public.household_role(s.household_id) in ('owner', 'admin') for update;
  if result.id is null then raise exception 'schedule_not_found_or_forbidden'; end if;
  if result.status = 'archived' then raise exception 'archived_schedule_cannot_change'; end if;
  update public.schedules set title = coalesce(nullif(trim(definition_value->>'title'), ''), title),
    category = coalesce(definition_value->>'category', category), start_date = coalesce((definition_value->>'start_date')::date, start_date),
    end_date = case when definition_value ? 'end_date' then nullif(definition_value->>'end_date', '')::date else end_date end,
    repeat_interval = coalesce((definition_value->>'repeat_interval')::integer, repeat_interval), repeat_unit = coalesce(definition_value->>'repeat_unit', repeat_unit),
    days_of_week = coalesce((select array_agg(value::smallint order by value::smallint) from jsonb_array_elements_text(definition_value->'days_of_week')), days_of_week),
    day_of_month = case when definition_value ? 'day_of_month' then nullif(definition_value->>'day_of_month', '')::smallint else day_of_month end,
    last_day = coalesce((definition_value->>'last_day')::boolean, last_day), updated_at = now()
  where id = schedule_id_value returning * into result;
  if definition_value ? 'slots' then
    for slot_record in select value from jsonb_array_elements(definition_value->'slots') loop
      if nullif(slot_record->>'id', '') is not null then
        update public.schedule_slots set label = trim(slot_record->>'label'), local_time = (slot_record->>'local_time')::time, sort_order = (slot_record->>'sort_order')::integer, is_active = coalesce((slot_record->>'is_active')::boolean, true), updated_at = now()
        where id = (slot_record->>'id')::uuid and schedule_id = schedule_id_value;
      else
        insert into public.schedule_slots (schedule_id, label, local_time, sort_order, is_active) values (schedule_id_value, trim(slot_record->>'label'), (slot_record->>'local_time')::time, (slot_record->>'sort_order')::integer, coalesce((slot_record->>'is_active')::boolean, true));
      end if;
    end loop;
  end if;
  if definition_value ? 'targets' then
    update public.schedule_targets set is_active = false where schedule_id = schedule_id_value;
    for target_record in select value from jsonb_array_elements(definition_value->'targets') loop
      insert into public.schedule_targets (schedule_id, target_key, cat_id, litter_box_id, is_active)
      values (schedule_id_value, target_record->>'target_key', nullif(target_record->>'cat_id', '')::uuid, nullif(target_record->>'litter_box_id', '')::uuid, true)
      on conflict (schedule_id, target_key) do update set cat_id = excluded.cat_id, litter_box_id = excluded.litter_box_id, is_active = true;
    end loop;
  end if;
  return result;
end;
$$;

create or replace function public.archive_schedule(schedule_id_value uuid)
returns public.schedules language plpgsql security definer set search_path = public as $$
declare result public.schedules;
begin
  update public.schedules s set status = 'archived', is_active = false, updated_at = now()
  where s.id = schedule_id_value and public.household_role(s.household_id) in ('owner', 'admin') and s.status <> 'archived'
  returning s.* into result;
  if result.id is null then raise exception 'schedule_not_found_or_forbidden'; end if;
  return result;
end;
$$;

grant execute on function public.generate_schedule_occurrences(uuid, date, date) to authenticated;
grant execute on function public.create_schedule(text, text, timestamptz, uuid, date, date, integer, text, text, smallint[], smallint, boolean, jsonb, jsonb) to authenticated;
grant execute on function public.pause_schedule(uuid) to authenticated;
grant execute on function public.resume_schedule(uuid) to authenticated;
grant execute on function public.update_schedule_definition(uuid, jsonb) to authenticated;
grant execute on function public.archive_schedule(uuid) to authenticated;

create or replace function public.delete_schedule(schedule_id_value uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare schedule_row public.schedules;
begin
  select s.* into schedule_row from public.schedules s
  where s.id = schedule_id_value and public.household_role(s.household_id) in ('owner', 'admin')
  for update;
  if schedule_row.id is null then raise exception 'schedule_not_found_or_forbidden'; end if;
  if schedule_row.status = 'archived' or exists (select 1 from public.schedule_occurrences where schedule_id = schedule_id_value) then
    raise exception 'schedule_has_history_archive_instead';
  end if;
  delete from public.schedules where id = schedule_id_value;
  return true;
end;
$$;
grant execute on function public.delete_schedule(uuid) to authenticated;

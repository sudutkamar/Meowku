-- Task 5: schedule definitions, target-level occurrences, and idempotent generation.
alter table public.schedules add column if not exists is_active boolean not null default true;
alter table public.schedules add column if not exists days_of_week smallint[] not null default '{}';
alter table public.schedules add column if not exists timezone text not null default 'Asia/Jakarta';
alter table public.schedules add constraint schedules_repeat_interval_positive check (repeat_interval > 0);
alter table public.schedules add constraint schedules_repeat_unit_valid check (repeat_unit in ('day', 'week', 'month'));
alter table public.schedules add constraint schedules_days_of_week_valid check (
  days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
);

create table if not exists public.schedule_targets (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  target_key text not null,
  cat_id uuid references public.cats(id) on delete cascade,
  litter_box_id uuid references public.litter_boxes(id) on delete cascade,
  unique (schedule_id, target_key),
  check (cat_id is not null or litter_box_id is not null or target_key = 'household')
);
alter table public.schedule_targets add column if not exists target_key text;
update public.schedule_targets set target_key = coalesce(target_key, 'cat:' || cat_id::text, 'litter:' || litter_box_id::text, 'household');
alter table public.schedule_targets alter column target_key set not null;
create unique index if not exists schedule_targets_schedule_target_key_idx on public.schedule_targets(schedule_id, target_key);

create table if not exists public.schedule_occurrences (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  target_key text not null,
  local_date date not null,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (schedule_id, target_key, local_date)
);
alter table public.schedule_occurrences add column if not exists note text not null default '';

create index if not exists schedules_household_active_idx on public.schedules(household_id, is_active);
create index if not exists schedule_targets_schedule_idx on public.schedule_targets(schedule_id);
create index if not exists occurrences_household_date_idx on public.schedule_occurrences(household_id, local_date);

alter table public.schedules enable row level security;
alter table public.schedule_targets enable row level security;
alter table public.schedule_occurrences enable row level security;

drop policy if exists schedules_member on public.schedules;
create policy schedules_member on public.schedules
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and owner_id = auth.uid());
drop policy if exists schedule_targets_member on public.schedule_targets;
create policy schedule_targets_member on public.schedule_targets
  for all using (exists (select 1 from public.schedules s where s.id = schedule_id and public.is_household_member(s.household_id)))
  with check (exists (select 1 from public.schedules s where s.id = schedule_id and public.is_household_member(s.household_id)));
drop policy if exists schedule_occurrences_member on public.schedule_occurrences;
create policy schedule_occurrences_member on public.schedule_occurrences
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create or replace function public.generate_schedule_occurrences(
  requested_household_id uuid,
  range_start date,
  range_end date
) returns integer language plpgsql security invoker set search_path = public as $$
declare
  inserted_count integer := 0;
begin
  if not public.is_household_member(requested_household_id) then
    raise exception 'household_access_denied';
  end if;
  if range_end < range_start or range_end - range_start > 366 then
    raise exception 'invalid_date_range';
  end if;

  insert into public.schedule_occurrences (schedule_id, household_id, target_key, local_date, scheduled_at)
   select s.id, s.household_id, coalesce(t.target_key, 'household'), d.local_date::date,
    (d.local_date::date::text || ' 09:00:00')::timestamp at time zone coalesce(nullif(s.timezone, ''), 'Asia/Jakarta')
  from public.schedules s
  left join public.schedule_targets t on t.schedule_id = s.id
  cross join lateral generate_series(range_start, range_end, interval '1 day') as d(local_date)
  where s.household_id = requested_household_id and s.is_active
     and d.local_date::date >= coalesce(s.start_date, d.local_date::date)
     and d.local_date::date <= coalesce(s.end_date, d.local_date::date)
    and (
      (s.repeat_unit = 'day' and mod((d.local_date::date - coalesce(s.start_date, d.local_date::date)), s.repeat_interval) = 0)
      or (s.repeat_unit = 'week' and mod((d.local_date::date - coalesce(s.start_date, d.local_date::date)) / 7, s.repeat_interval) = 0
        and (cardinality(s.days_of_week) = 0 or extract(dow from d.local_date::date)::smallint = any(s.days_of_week)))
      or (s.repeat_unit = 'month' and extract(day from d.local_date::date) = extract(day from coalesce(s.start_date, d.local_date::date))
        and mod((extract(year from d.local_date::date)::integer * 12 + extract(month from d.local_date::date)::integer)
          - (extract(year from coalesce(s.start_date, d.local_date::date))::integer * 12 + extract(month from coalesce(s.start_date, d.local_date::date))::integer), s.repeat_interval) = 0)
    )
  on conflict (schedule_id, target_key, local_date) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

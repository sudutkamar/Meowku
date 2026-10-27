-- Global household weekday rotation. Occurrences snapshot assigned_to at generation time.
alter table public.schedule_occurrences
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create table if not exists public.household_schedule_rotations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null unique references public.households(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_rotation_date_range check (end_date >= start_date)
);

create table if not exists public.household_schedule_rotation_days (
  id uuid primary key default gen_random_uuid(),
  rotation_id uuid not null references public.household_schedule_rotations(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  user_id uuid not null references auth.users(id) on delete restrict,
  unique (rotation_id, weekday)
);

create index if not exists schedule_occurrences_assigned_to_idx
  on public.schedule_occurrences(household_id, assigned_to, local_date);

alter table public.household_schedule_rotations enable row level security;
alter table public.household_schedule_rotation_days enable row level security;

drop policy if exists profiles_household_member_select on public.profiles;
create policy profiles_household_member_select on public.profiles
  for select using (exists (
    select 1 from public.household_members target_member
    where target_member.user_id = profiles.id
      and public.is_household_member(target_member.household_id)
      and target_member.is_active
  ));

drop policy if exists schedule_rotations_member_select on public.household_schedule_rotations;
create policy schedule_rotations_member_select on public.household_schedule_rotations
  for select using (public.is_household_member(household_id));

drop policy if exists schedule_rotation_days_member_select on public.household_schedule_rotation_days;
create policy schedule_rotation_days_member_select on public.household_schedule_rotation_days
  for select using (exists (
    select 1 from public.household_schedule_rotations r
    where r.id = rotation_id and public.is_household_member(r.household_id)
  ));

create or replace function public.validate_schedule_rotation_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare rotation_household uuid;
begin
  select household_id into rotation_household
  from public.household_schedule_rotations
  where id = new.rotation_id;
  if rotation_household is null then raise exception 'schedule_rotation_not_found'; end if;
  if not exists (
    select 1 from public.household_members m
    where m.household_id = rotation_household and m.user_id = new.user_id and m.is_active
  ) then
    raise exception 'rotation_member_not_active';
  end if;
  return new;
end;
$$;

drop trigger if exists schedule_rotation_member_validate on public.household_schedule_rotation_days;
create trigger schedule_rotation_member_validate
before insert or update on public.household_schedule_rotation_days
for each row execute function public.validate_schedule_rotation_member();

create or replace function public.get_household_schedule_rotation(requested_household_id uuid)
returns jsonb language sql security invoker set search_path = public as $$
  select coalesce((
    select jsonb_build_object(
      'rotation', to_jsonb(r),
      'days', coalesce((
        select jsonb_agg(to_jsonb(d) order by d.weekday)
        from public.household_schedule_rotation_days d
        where d.rotation_id = r.id
      ), '[]'::jsonb)
    )
    from public.household_schedule_rotations r
    where r.household_id = requested_household_id and r.is_active
  ), jsonb_build_object('rotation', null, 'days', '[]'::jsonb));
$$;

create or replace function public.save_household_schedule_rotation(
  requested_household_id uuid,
  start_date_value date,
  end_date_value date,
  days_value jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare rotation public.household_schedule_rotations; entry jsonb; weekday_value smallint; user_id_value uuid;
begin
  if public.household_role(requested_household_id) not in ('owner', 'admin') then
    raise exception 'schedule_rotation_admin_required';
  end if;
  if end_date_value < start_date_value then raise exception 'invalid_rotation_range'; end if;
  if jsonb_typeof(coalesce(days_value, '[]'::jsonb)) <> 'array' then raise exception 'invalid_rotation_days'; end if;

  for entry in select value from jsonb_array_elements(coalesce(days_value, '[]'::jsonb)) loop
    weekday_value := nullif(entry->>'weekday', '')::smallint;
    user_id_value := nullif(entry->>'user_id', '')::uuid;
    if weekday_value is null or weekday_value < 1 or weekday_value > 7 or user_id_value is null then
      raise exception 'invalid_rotation_day';
    end if;
    if not exists (
      select 1 from public.household_members m
      where m.household_id = requested_household_id and m.user_id = user_id_value and m.is_active
    ) then
      raise exception 'rotation_member_not_active';
    end if;
    if (select count(*) from jsonb_array_elements(coalesce(days_value, '[]'::jsonb)) other_entry
      where (other_entry->>'weekday')::smallint = weekday_value) > 1 then
      raise exception 'duplicate_rotation_day';
    end if;
  end loop;

  insert into public.household_schedule_rotations (household_id, start_date, end_date, is_active, created_by, updated_by)
  values (requested_household_id, start_date_value, end_date_value, true, auth.uid(), auth.uid())
  on conflict (household_id) do update set
    start_date = excluded.start_date, end_date = excluded.end_date, is_active = true,
    updated_by = auth.uid(), updated_at = now()
  returning * into rotation;

  delete from public.household_schedule_rotation_days where rotation_id = rotation.id;
  for entry in select value from jsonb_array_elements(coalesce(days_value, '[]'::jsonb)) loop
    insert into public.household_schedule_rotation_days (rotation_id, weekday, user_id)
    values (rotation.id, (entry->>'weekday')::smallint, (entry->>'user_id')::uuid);
  end loop;

  -- Apply a newly configured rotation only to future, incomplete rows that have no snapshot yet.
  update public.schedule_occurrences o
  set assigned_to = d.user_id
  from public.schedules s
  join public.households h on h.id = s.household_id
  join public.household_schedule_rotation_days d on d.rotation_id = rotation.id
  where o.schedule_id = s.id
    and o.household_id = requested_household_id
    and o.assigned_to is null
    and o.completed_at is null
    and o.archived_at is null
    and d.weekday = extract(isodow from o.local_date)::smallint
    and o.local_date between rotation.start_date and rotation.end_date
    and o.local_date >= (now() at time zone coalesce(nullif(h.timezone, ''), 'Asia/Jakarta'))::date;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (requested_household_id, auth.uid(), 'updated', 'schedule_rotation', rotation.id,
    jsonb_build_object('start_date', rotation.start_date, 'end_date', rotation.end_date, 'days', coalesce(days_value, '[]'::jsonb)));
  return public.get_household_schedule_rotation(requested_household_id);
end;
$$;

grant execute on function public.get_household_schedule_rotation(uuid) to authenticated;
grant execute on function public.save_household_schedule_rotation(uuid, date, date, jsonb) to authenticated;

create or replace function public.generate_schedule_occurrences(
  requested_household_id uuid, range_start date, range_end date
) returns integer language plpgsql security definer set search_path = public as $$
declare inserted_count integer := 0;
begin
  if auth.uid() is null or not public.is_household_member(requested_household_id) then raise exception 'household_access_denied'; end if;
  if range_end < range_start or range_end - range_start > 3660 then raise exception 'invalid_date_range'; end if;

  insert into public.schedule_occurrences (schedule_id, household_id, target_key, slot_id, local_date, scheduled_at, assigned_to)
  select s.id, s.household_id, coalesce(t.target_key, 'household'), slot.id, d.local_date::date,
    ((d.local_date::date::text || ' ' || slot.local_time::text)::timestamp at time zone coalesce(nullif(s.timezone, ''), 'Asia/Jakarta')),
    rotation_day.user_id
  from public.schedules s
  join public.schedule_slots slot on slot.schedule_id = s.id and slot.is_active
  left join public.schedule_targets t on t.schedule_id = s.id and t.is_active
  cross join lateral generate_series(range_start, range_end, interval '1 day') as d(local_date)
  left join public.household_schedule_rotations rotation
    on rotation.household_id = s.household_id and rotation.is_active
    and d.local_date::date between rotation.start_date and rotation.end_date
  left join public.household_schedule_rotation_days rotation_day
    on rotation_day.rotation_id = rotation.id
    and rotation_day.weekday = extract(isodow from d.local_date::date)::smallint
  where s.household_id = requested_household_id and s.status = 'active' and s.is_active
    and public.schedule_is_due(s, d.local_date::date)
  on conflict (schedule_id, target_key, local_date, slot_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

grant execute on function public.generate_schedule_occurrences(uuid, date, date) to authenticated;

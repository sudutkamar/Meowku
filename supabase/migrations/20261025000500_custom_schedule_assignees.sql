alter table public.cat_scan_records alter column attachment_id drop not null;

create table if not exists public.household_assignees (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  linked_user_id uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.household_assignees enable row level security;
create index if not exists household_assignees_household_idx on public.household_assignees(household_id, is_active, display_name);
drop policy if exists household_assignees_member_select on public.household_assignees;
create policy household_assignees_member_select on public.household_assignees for select using (public.is_household_member(household_id));

alter table public.household_schedule_rotation_days add column if not exists assignee_id uuid references public.household_assignees(id) on delete restrict;
insert into public.household_assignees(household_id, display_name, linked_user_id, created_by)
select distinct m.household_id, coalesce(nullif(p.full_name, ''), m.user_id::text), m.user_id, m.user_id
from public.household_schedule_rotation_days d
join public.household_schedule_rotations r on r.id = d.rotation_id
join public.household_members m on m.household_id = r.household_id and m.user_id = d.user_id
left join public.profiles p on p.id = m.user_id
where d.user_id is not null and not exists (select 1 from public.household_assignees a where a.household_id = m.household_id and a.linked_user_id = m.user_id);
update public.household_schedule_rotation_days d
set assignee_id = a.id
from public.household_schedule_rotations r, public.household_assignees a
where d.rotation_id = r.id and a.household_id = r.household_id and a.linked_user_id = d.user_id and d.assignee_id is null and d.user_id is not null;
alter table public.household_schedule_rotation_days alter column user_id drop not null;
alter table public.household_schedule_rotation_days drop constraint if exists household_schedule_rotation_days_assignment_check;
alter table public.household_schedule_rotation_days add constraint household_schedule_rotation_days_assignment_check check (user_id is not null or assignee_id is not null);
alter table public.schedule_occurrences add column if not exists assignee_id uuid references public.household_assignees(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'schedule_occurrences_assignee_id_fkey') then
    alter table public.schedule_occurrences add constraint schedule_occurrences_assignee_id_fkey foreign key (assignee_id) references public.household_assignees(id) on delete set null;
  end if;
end $$;
create index if not exists schedule_occurrences_assignee_idx on public.schedule_occurrences(household_id, assignee_id, local_date);

create or replace function public.save_household_assignee(requested_household_id uuid, display_name_value text, linked_user_id_value uuid default null, assignee_id_value uuid default null)
returns public.household_assignees language plpgsql security definer set search_path = public as $$
declare result public.household_assignees;
begin
  if public.household_role(requested_household_id) not in ('owner', 'admin') then raise exception 'assignee_admin_required'; end if;
  if length(btrim(display_name_value)) not between 1 and 120 then raise exception 'invalid_assignee_name'; end if;
  if linked_user_id_value is not null and not exists (select 1 from public.household_members where household_id = requested_household_id and user_id = linked_user_id_value and is_active) then raise exception 'linked_user_not_active'; end if;
  if assignee_id_value is null then
    insert into public.household_assignees(household_id, display_name, linked_user_id, created_by) values (requested_household_id, btrim(display_name_value), linked_user_id_value, auth.uid()) returning * into result;
  else
    update public.household_assignees set display_name = btrim(display_name_value), linked_user_id = linked_user_id_value, updated_at = now(), is_active = true where id = assignee_id_value and household_id = requested_household_id returning * into result;
    if result.id is null then raise exception 'assignee_not_found'; end if;
  end if;
  return result;
end;
$$;

create or replace function public.archive_household_assignee(requested_household_id uuid, assignee_id_value uuid)
returns public.household_assignees language plpgsql security definer set search_path = public as $$
declare result public.household_assignees;
begin
  if public.household_role(requested_household_id) not in ('owner', 'admin') then raise exception 'assignee_admin_required'; end if;
  update public.household_assignees set is_active = false, updated_at = now() where id = assignee_id_value and household_id = requested_household_id returning * into result;
  if result.id is null then raise exception 'assignee_not_found'; end if;
  return result;
end;
$$;

grant execute on function public.save_household_assignee(uuid, text, uuid, uuid) to authenticated;
grant execute on function public.archive_household_assignee(uuid, uuid) to authenticated;

create or replace function public.get_household_schedule_rotation(requested_household_id uuid)
returns jsonb language sql security invoker set search_path = public as $$
  select coalesce((select jsonb_build_object('rotation', to_jsonb(r), 'days', coalesce((select jsonb_agg(to_jsonb(d) order by d.weekday) from public.household_schedule_rotation_days d where d.rotation_id = r.id), '[]'::jsonb)) from public.household_schedule_rotations r where r.household_id = requested_household_id and r.is_active), jsonb_build_object('rotation', null, 'days', '[]'::jsonb));
$$;

create or replace function public.save_household_schedule_rotation(requested_household_id uuid, start_date_value date, end_date_value date, days_value jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare rotation public.household_schedule_rotations; entry jsonb; weekday_value smallint; assignee_value uuid;
begin
  if public.household_role(requested_household_id) not in ('owner', 'admin') then raise exception 'schedule_rotation_admin_required'; end if;
  if end_date_value < start_date_value then raise exception 'invalid_rotation_range'; end if;
  if jsonb_typeof(coalesce(days_value, '[]'::jsonb)) <> 'array' then raise exception 'invalid_rotation_days'; end if;
  for entry in select value from jsonb_array_elements(coalesce(days_value, '[]'::jsonb)) loop
    weekday_value := nullif(entry->>'weekday', '')::smallint;
    assignee_value := nullif(entry->>'assignee_id', '')::uuid;
    if weekday_value is null or weekday_value not between 1 and 7 or assignee_value is null then raise exception 'invalid_rotation_day'; end if;
    if not exists (select 1 from public.household_assignees a where a.id = assignee_value and a.household_id = requested_household_id and a.is_active) then raise exception 'assignee_not_active'; end if;
    if (select count(*) from jsonb_array_elements(coalesce(days_value, '[]'::jsonb)) other_entry where (other_entry->>'weekday')::smallint = weekday_value) > 1 then raise exception 'duplicate_rotation_day'; end if;
  end loop;
  insert into public.household_schedule_rotations(household_id, start_date, end_date, is_active, created_by, updated_by) values (requested_household_id, start_date_value, end_date_value, true, auth.uid(), auth.uid()) on conflict (household_id) do update set start_date = excluded.start_date, end_date = excluded.end_date, is_active = true, updated_by = auth.uid(), updated_at = now() returning * into rotation;
  delete from public.household_schedule_rotation_days where rotation_id = rotation.id;
  for entry in select value from jsonb_array_elements(coalesce(days_value, '[]'::jsonb)) loop
    insert into public.household_schedule_rotation_days(rotation_id, weekday, user_id, assignee_id) select rotation.id, (entry->>'weekday')::smallint, a.linked_user_id, a.id from public.household_assignees a where a.id = (entry->>'assignee_id')::uuid;
  end loop;
  update public.schedule_occurrences o set assignee_id = d.assignee_id, assigned_to = a.linked_user_id from public.schedules s join public.households h on h.id = s.household_id join public.household_schedule_rotation_days d on d.rotation_id = rotation.id join public.household_assignees a on a.id = d.assignee_id where o.schedule_id = s.id and o.household_id = requested_household_id and o.assignee_id is null and o.assigned_to is null and o.completed_at is null and o.archived_at is null and d.weekday = extract(isodow from o.local_date)::smallint and o.local_date between rotation.start_date and rotation.end_date and o.local_date >= (now() at time zone coalesce(nullif(h.timezone, ''), 'Asia/Jakarta'))::date;
  insert into public.audit_events(household_id, actor_id, action, entity_type, entity_id, metadata) values (requested_household_id, auth.uid(), 'updated', 'schedule_rotation', rotation.id, jsonb_build_object('start_date', rotation.start_date, 'end_date', rotation.end_date, 'days', coalesce(days_value, '[]'::jsonb)));
  return public.get_household_schedule_rotation(requested_household_id);
end;
$$;

create or replace function public.generate_schedule_occurrences(requested_household_id uuid, range_start date, range_end date)
returns integer language plpgsql security definer set search_path = public as $$
declare inserted_count integer := 0;
begin
  if auth.uid() is null or not public.is_household_member(requested_household_id) then raise exception 'household_access_denied'; end if;
  if range_end < range_start or range_end - range_start > 3660 then raise exception 'invalid_date_range'; end if;
  insert into public.schedule_occurrences(schedule_id, household_id, target_key, slot_id, local_date, scheduled_at, assigned_to, assignee_id)
  select s.id, s.household_id, coalesce(t.target_key, 'household'), slot.id, d.local_date::date, ((d.local_date::date::text || ' ' || slot.local_time::text)::timestamp at time zone coalesce(nullif(s.timezone, ''), 'Asia/Jakarta')), rotation_assignee.linked_user_id, rotation_assignee.id
  from public.schedules s join public.schedule_slots slot on slot.schedule_id = s.id and slot.is_active left join public.schedule_targets t on t.schedule_id = s.id and t.is_active cross join lateral generate_series(range_start, range_end, interval '1 day') as d(local_date) left join public.household_schedule_rotations rotation on rotation.household_id = s.household_id and rotation.is_active and d.local_date::date between rotation.start_date and rotation.end_date left join public.household_schedule_rotation_days rotation_day on rotation_day.rotation_id = rotation.id and rotation_day.weekday = extract(isodow from d.local_date::date)::smallint left join public.household_assignees rotation_assignee on rotation_assignee.id = rotation_day.assignee_id
  where s.household_id = requested_household_id and s.status = 'active' and s.is_active and public.schedule_is_due(s, d.local_date::date)
  on conflict (schedule_id, target_key, local_date, slot_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

notify pgrst, 'reload schema';

-- Fix: assignee was frozen at generation time and never corrected.
-- Root cause: generate_schedule_occurrences ON CONFLICT only updated
-- scheduled_at (never assigned_to/assignee_id), and
-- save_household_schedule_rotation only patched rows where both were NULL.
-- So a stale assignee (e.g. B on a day that should be A) persisted forever.
--
-- Strategy:
--  1. generate_schedule_occurrences: also refresh assignee on conflict for
--     future, incomplete, unarchived rows.
--  2. save_household_schedule_rotation: refresh assignee for ALL future,
--     incomplete, unarchived rows (drop the IS NULL guard).
--  3. repair_future_occurrence_assignments(): idempotent repair RPC.
--  4. household_schedule_occurrences(): read-time dynamic assignment —
--     future pending rows always resolve assignee from the CURRENT rotation
--     for their weekday; completed/archived/past rows keep the frozen
--     snapshot (immutable history). This is the correct source of truth for
--     the checklist UI.
--  5. One-off repair of existing stale rows (same rules).

-- ---------------------------------------------------------------------------
-- Helper: effective assignee for an occurrence.
-- ---------------------------------------------------------------------------
create or replace function public.effective_assignee_for_occurrence(
  occurrence_id uuid,
  p_household_id uuid,
  local_date date,
  completed_at timestamptz,
  archived_at timestamptz,
  frozen_assignee_id uuid,
  frozen_assigned_to uuid
) returns table (assignee_id uuid, assigned_to uuid)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  today date;
  rotation public.household_schedule_rotations;
  rotation_day public.household_schedule_rotation_days;
  assignee public.household_assignees;
begin
  select (now() at time zone coalesce(nullif(h.timezone, ''), 'Asia/Jakarta'))::date
    into today
  from public.households h where h.id = p_household_id;

  -- Past/archived history is immutable: keep frozen snapshot.
  if archived_at is not null or local_date < today then
    return query select frozen_assignee_id, frozen_assigned_to;
    return;
  end if;

  -- Today + future (including completed today): resolve by CURRENT rotation
  -- so "Petugas" selalu menunjukkan penanggung jawab yang benar hari ini.
  -- Who completed is already shown separately ("Selesai oleh").

  select * into rotation
  from public.household_schedule_rotations r
  where r.household_id = p_household_id
    and r.is_active
    and r.start_date <= local_date and r.end_date >= local_date;

  if rotation.id is null then
    return query select frozen_assignee_id, frozen_assigned_to;
    return;
  end if;

  select d.* into rotation_day
  from public.household_schedule_rotation_days d
  where d.rotation_id = rotation.id
    and d.weekday = extract(isodow from local_date)::smallint;

  if rotation_day.assignee_id is null then
    return query select frozen_assignee_id, frozen_assigned_to;
    return;
  end if;

  select * into assignee
  from public.household_assignees
  where id = rotation_day.assignee_id and is_active;

  if assignee.id is null then
    return query select frozen_assignee_id, frozen_assigned_to;
    return;
  end if;

  return query select assignee.id, assignee.linked_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Repair: align stored assignee with current rotation for future rows.
-- ---------------------------------------------------------------------------
create or replace function public.repair_future_occurrence_assignments_internal(
  requested_household_id uuid
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  repaired integer := 0;
  today date;
begin
  -- Internal: no auth check (used by migration-time repair).

  select (now() at time zone coalesce(nullif(h.timezone, ''), 'Asia/Jakarta'))::date
    into today
  from public.households h where h.id = requested_household_id;

  update public.schedule_occurrences o
  set assignee_id = eff.assignee_id,
      assigned_to = eff.assigned_to
  from (
    select o2.id as occurrence_id, eff2.assignee_id, eff2.assigned_to
    from public.schedule_occurrences o2
    cross join lateral public.effective_assignee_for_occurrence(
      o2.id, o2.household_id, o2.local_date, o2.completed_at, o2.archived_at,
      o2.assignee_id, o2.assigned_to
    ) eff2
    where o2.household_id = requested_household_id
      and o2.archived_at is null
      and o2.local_date >= today
      and (o2.assignee_id is distinct from eff2.assignee_id
           or o2.assigned_to is distinct from eff2.assigned_to)
  ) eff
  where o.id = eff.occurrence_id;

  get diagnostics repaired = row_count;
  return repaired;
end;
$$;

create or replace function public.repair_future_occurrence_assignments(
  requested_household_id uuid
) returns integer
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_household_member(requested_household_id) then
    raise exception 'household_access_denied';
  end if;
  return public.repair_future_occurrence_assignments_internal(requested_household_id);
end;
$$;

-- One-off repair for all households (migration-time, bypasses RLS by design).
-- Berjalan sebagai pemilik migrasi (bukan auth.uid()), jadi tidak boleh
-- mengandalkan is_household_member() di sini — panggil helper langsung.
do $$
declare h_id uuid;
begin
  for h_id in select h.id from public.households h loop
    perform public.repair_future_occurrence_assignments_internal(h_id);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- generate_schedule_occurrences: refresh assignee on re-generate too.
-- ---------------------------------------------------------------------------
create or replace function public.generate_schedule_occurrences(
  requested_household_id uuid,
  range_start date,
  range_end date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if auth.uid() is null or not public.is_household_member(requested_household_id) then
    raise exception 'household_access_denied';
  end if;
  if range_end < range_start or range_end - range_start > 3660 then
    raise exception 'invalid_date_range';
  end if;

  insert into public.schedule_occurrences as occurrence
    (schedule_id, household_id, target_key, slot_id, local_date, scheduled_at, assigned_to, assignee_id)
  select
    schedule_row.id,
    schedule_row.household_id,
    coalesce(target_row.target_key, 'household'),
    slot_row.id,
    candidate.local_date::date,
    ((candidate.local_date::date::text || ' ' || slot_row.local_time::text)::timestamp
      at time zone coalesce(nullif(schedule_row.timezone, ''), 'Asia/Jakarta')),
    rotation_assignee.linked_user_id,
    rotation_assignee.id
  from public.schedules schedule_row
  join public.schedule_slots slot_row
    on slot_row.schedule_id = schedule_row.id
   and slot_row.is_active
  left join public.schedule_targets target_row
    on target_row.schedule_id = schedule_row.id
   and target_row.is_active
  cross join lateral generate_series(range_start, range_end, interval '1 day') as candidate(local_date)
  left join public.household_schedule_rotations rotation_row
    on rotation_row.household_id = schedule_row.household_id
   and rotation_row.is_active
   and candidate.local_date::date between rotation_row.start_date and rotation_row.end_date
  left join public.household_schedule_rotation_days rotation_day
    on rotation_day.rotation_id = rotation_row.id
   and rotation_day.weekday = extract(isodow from candidate.local_date::date)::smallint
  left join public.household_assignees rotation_assignee
    on rotation_assignee.id = rotation_day.assignee_id
   and rotation_assignee.is_active
  where schedule_row.household_id = requested_household_id
    and schedule_row.status = 'active'
    and schedule_row.is_active
    and public.schedule_is_due(schedule_row, candidate.local_date::date)
  on conflict (schedule_id, target_key, local_date, slot_id) do update
    set scheduled_at = excluded.scheduled_at,
        assignee_id = excluded.assignee_id,
        assigned_to = excluded.assigned_to
  where occurrence.completed_at is null
    and occurrence.archived_at is null
    and occurrence.local_date >= (
      now() at time zone coalesce(
        nullif((select timezone from public.schedules where id = occurrence.schedule_id), ''),
        'Asia/Jakarta'
      )
    )::date;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- save_household_schedule_rotation: patch ALL future rows, not only NULLs.
-- ---------------------------------------------------------------------------
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
  -- FIX: remove `o.assignee_id is null and o.assigned_to is null` guard —
  -- future incomplete rows must follow the new rotation even if previously filled.
  update public.schedule_occurrences o
  set assignee_id = d.assignee_id, assigned_to = a.linked_user_id
  from public.schedules s
  join public.households h on h.id = s.household_id
  join public.household_schedule_rotation_days d on d.rotation_id = rotation.id
  join public.household_assignees a on a.id = d.assignee_id
  where o.schedule_id = s.id and o.household_id = requested_household_id
    and o.completed_at is null and o.archived_at is null
    and d.weekday = extract(isodow from o.local_date)::smallint
    and o.local_date between rotation.start_date and rotation.end_date
    and o.local_date >= (now() at time zone coalesce(nullif(h.timezone, ''), 'Asia/Jakarta'))::date;
  insert into public.audit_events(household_id, actor_id, action, entity_type, entity_id, metadata) values (requested_household_id, auth.uid(), 'updated', 'schedule_rotation', rotation.id, jsonb_build_object('start_date', rotation.start_date, 'end_date', rotation.end_date, 'days', coalesce(days_value, '[]'::jsonb)));
  return public.get_household_schedule_rotation(requested_household_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Read-time dynamic occurrences (source of truth for checklist UI).
-- ---------------------------------------------------------------------------
create or replace function public.household_schedule_occurrences(
  requested_household_id uuid,
  from_date date,
  to_date date
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not public.is_household_member(requested_household_id) then
    raise exception 'household_access_denied';
  end if;

  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.local_date, rows.scheduled_at), '[]'::jsonb)
  into result
  from (
    select
      o.id,
      o.schedule_id,
      o.target_key,
      o.slot_id,
      o.local_date,
      o.scheduled_at,
      eff.assigned_to,
      eff.assignee_id,
      o.completed_at,
      o.completed_by,
      o.archived_at,
      o.archived_by,
      o.note,
      o.created_at,
      jsonb_build_object(
        'title', s.title,
        'category', s.category,
        'custom_category', s.custom_category,
        'status', s.status,
        'is_active', s.is_active,
        'start_date', s.start_date,
        'end_date', s.end_date,
        'repeat_interval', s.repeat_interval,
        'repeat_unit', s.repeat_unit
      ) as schedules,
      jsonb_build_object('label', sl.label, 'local_time', sl.local_time) as schedule_slots,
      case when eff.assignee_id is not null then
        jsonb_build_object('display_name', a.display_name)
      else null end as household_assignees
    from public.schedule_occurrences o
    join public.schedules s on s.id = o.schedule_id and s.is_active and s.status = 'active'
    join public.schedule_slots sl on sl.id = o.slot_id
    left join lateral public.effective_assignee_for_occurrence(
      o.id, o.household_id, o.local_date, o.completed_at, o.archived_at,
      o.assignee_id, o.assigned_to
    ) eff on true
    left join public.household_assignees a on a.id = eff.assignee_id
    where o.household_id = requested_household_id
      and o.archived_at is null
      and o.local_date between from_date and to_date
  ) rows;
  return result;
end;
$$;

grant execute on function public.effective_assignee_for_occurrence(uuid, uuid, date, timestamptz, timestamptz, uuid, uuid) to authenticated;
grant execute on function public.repair_future_occurrence_assignments(uuid) to authenticated;
revoke all on function public.repair_future_occurrence_assignments_internal(uuid) from public, authenticated, anon;
grant execute on function public.household_schedule_occurrences(uuid, date, date) to authenticated;

notify pgrst, 'reload schema';

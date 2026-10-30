-- Keep the next-day checklist materialized even when a previous generation
-- attempt was interrupted. Existing completed, archived, and past rows stay
-- immutable; only incomplete future rows may receive a corrected slot time.

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
    set scheduled_at = excluded.scheduled_at
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

grant execute on function public.generate_schedule_occurrences(uuid, date, date) to authenticated;
notify pgrst, 'reload schema';

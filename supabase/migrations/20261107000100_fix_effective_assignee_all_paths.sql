-- Final hardening for schedule assignee resolution.
-- Ensures every read path (checklist, tomorrow, history, performance report)
-- uses the effective assignee (manual override > active rotation for
-- today/future, including completed today; past/archived stays immutable).
-- Also re-applies the canonical effective function so databases that missed
-- an earlier migration converge to the same behavior.

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
  v_today date;
  v_rotation public.household_schedule_rotations;
  v_day public.household_schedule_rotation_days;
  v_assignee public.household_assignees;
  v_manual public.household_assignees;
begin
  -- Manual ad-hoc override always wins while the assignee is active.
  select o.manual_assignee_id into v_manual.id
  from public.schedule_occurrences o where o.id = occurrence_id;
  if v_manual.id is not null then
    select * into v_manual from public.household_assignees where id = v_manual.id and is_active;
    if v_manual.id is not null then
      return query select v_manual.id, v_manual.linked_user_id;
      return;
    end if;
  end if;

  select (now() at time zone coalesce(nullif(h.timezone, ''), 'Asia/Jakarta'))::date
    into v_today
  from public.households h where h.id = p_household_id;

  -- Past/archived history is immutable: keep frozen snapshot.
  if archived_at is not null or local_date < v_today then
    return query select frozen_assignee_id, frozen_assigned_to;
    return;
  end if;

  -- Today + future (including completed today): resolve by active rotation.
  select * into v_rotation
  from public.household_schedule_rotations r
  where r.household_id = p_household_id
    and r.is_active
    and r.start_date <= local_date and r.end_date >= local_date;

  if v_rotation.id is null then
    return query select frozen_assignee_id, frozen_assigned_to;
    return;
  end if;

  select d.* into v_day
  from public.household_schedule_rotation_days d
  where d.rotation_id = v_rotation.id
    and d.weekday = extract(isodow from local_date)::smallint;

  if v_day.assignee_id is null then
    return query select frozen_assignee_id, frozen_assigned_to;
    return;
  end if;

  select * into v_assignee
  from public.household_assignees
  where id = v_day.assignee_id and is_active;

  if v_assignee.id is null then
    return query select frozen_assignee_id, frozen_assigned_to;
    return;
  end if;

  return query select v_assignee.id, v_assignee.linked_user_id;
end;
$$;

-- Make the performance report use the same effective assignee as the UI,
-- so a rotation change is reflected for today/future rows while past rows
-- keep their immutable snapshot.
create or replace function public.household_task_performance(
  requested_household_id uuid,
  from_date date,
  to_date date,
  timezone_value text default 'Asia/Jakarta'
) returns table (
  occurrence_id uuid,
  schedule_id uuid,
  schedule_title text,
  category text,
  custom_category text,
  slot_label text,
  target_key text,
  target_label text,
  local_date date,
  scheduled_at timestamptz,
  assigned_key text,
  assigned_label text,
  assigned_user_id uuid,
  assignee_id uuid,
  completed_by uuid,
  completed_by_label text,
  completed_at timestamptz,
  archived_at timestamptz,
  note text,
  status text,
  delay_minutes integer
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.household_role(requested_household_id) not in ('owner', 'admin') then
    raise exception 'household_admin_required';
  end if;
  if from_date > to_date then
    raise exception 'invalid_report_range';
  end if;

  return query
  select
    o.id,
    o.schedule_id,
    s.title,
    s.category,
    s.custom_category,
    slot.label,
    o.target_key,
    case
      when o.target_key = 'household' then 'Semua rumah'
      when o.target_key like 'cat:%' then coalesce(c.name, 'Kucing')
      when o.target_key like 'litter:%' then coalesce(l.name, 'Litter box')
      else o.target_key
    end,
    o.local_date,
    o.scheduled_at,
    coalesce(eff.assignee_id::text, eff.assigned_to::text, 'unassigned'),
    coalesce(ha.display_name, assigned_profile.full_name, 'Belum ditugaskan'),
    eff.assigned_to,
    eff.assignee_id,
    o.completed_by,
    case when o.completed_by is null then null else coalesce(completed_profile.full_name, 'Akun dihapus') end,
    o.completed_at,
    o.archived_at,
    o.note,
    case
      when o.archived_at is not null then 'skipped'
      when o.completed_at is not null then 'completed'
      when o.local_date < (now() at time zone coalesce(nullif(trim(timezone_value), ''), 'Asia/Jakarta'))::date then 'missed'
      else 'pending'
    end,
    case
      when o.completed_at is not null and o.completed_at > o.scheduled_at
        then round(extract(epoch from (o.completed_at - o.scheduled_at)) / 60)::integer
      else 0
    end
  from public.schedule_occurrences o
  join public.schedules s on s.id = o.schedule_id and s.household_id = requested_household_id
  left join public.schedule_slots slot on slot.id = o.slot_id
  left join public.cats c on c.id = case when o.target_key ~ '^cat:[0-9a-fA-F-]{36}$' then substring(o.target_key from 5)::uuid end and c.household_id = requested_household_id
  left join public.litter_boxes l on l.id = case when o.target_key ~ '^litter:[0-9a-fA-F-]{36}$' then substring(o.target_key from 7)::uuid end and l.household_id = requested_household_id
  left join lateral public.effective_assignee_for_occurrence(
    o.id, o.household_id, o.local_date, o.completed_at, o.archived_at,
    o.assignee_id, o.assigned_to
  ) eff on true
  left join public.household_assignees ha on ha.id = eff.assignee_id and ha.household_id = requested_household_id
  left join public.profiles assigned_profile on assigned_profile.id = eff.assigned_to
  left join public.profiles completed_profile on completed_profile.id = o.completed_by
  where o.household_id = requested_household_id
    and o.local_date between from_date and to_date
  order by o.local_date desc, o.scheduled_at desc;
end;
$$;

grant execute on function public.effective_assignee_for_occurrence(uuid, uuid, date, timestamptz, timestamptz, uuid, uuid) to authenticated;
grant execute on function public.household_task_performance(uuid, date, date, text) to authenticated;

notify pgrst, 'reload schema';

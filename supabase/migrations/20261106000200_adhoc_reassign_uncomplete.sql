-- Swap petugas ad-hoc (#11) + Undo selesai, with manual override
-- priority: manual > rotation > frozen. RLS tetap di schedule_occurrences.

alter table public.schedule_occurrences
  add column if not exists manual_assignee_id uuid references public.household_assignees(id) on delete set null,
  add column if not exists manual_assigned_by uuid references auth.users(id) on delete set null,
  add column if not exists manual_assigned_at timestamptz;

create index if not exists schedule_occurrences_manual_assignee_idx
  on public.schedule_occurrences(household_id, manual_assignee_id, local_date);

-- effective_assignee now prefers manual override when set.
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

  if archived_at is not null or local_date < v_today then
    return query select frozen_assignee_id, frozen_assigned_to;
    return;
  end if;

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

create or replace function public.reassign_occurrence(
  occurrence_id uuid,
  assignee_id_value uuid
) returns public.schedule_occurrences
language plpgsql security definer set search_path = public as $$
declare
  occ public.schedule_occurrences;
  a public.household_assignees;
begin
  select * into occ from public.schedule_occurrences where id = occurrence_id for update;
  if occ.id is null then raise exception 'occurrence_not_found'; end if;
  if occ.household_id is null or not public.is_household_member(occ.household_id) then
    raise exception 'household_access_denied';
  end if;
  if occ.archived_at is not null then raise exception 'occurrence_archived'; end if;
  if occ.local_date < (now() at time zone coalesce(
    (select nullif(timezone, '') from public.households where id = occ.household_id),
    'Asia/Jakarta'
  ))::date then
    raise exception 'occurrence_in_past';
  end if;

  if assignee_id_value is null then
    update public.schedule_occurrences
    set manual_assignee_id = null, manual_assigned_by = null, manual_assigned_at = null
    where id = occurrence_id returning * into occ;
  else
    select * into a from public.household_assignees
    where id = assignee_id_value and household_id = occ.household_id and is_active;
    if a.id is null then raise exception 'assignee_not_active'; end if;
    update public.schedule_occurrences
    set manual_assignee_id = a.id, manual_assigned_by = auth.uid(), manual_assigned_at = now()
    where id = occurrence_id returning * into occ;
  end if;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (occ.household_id, auth.uid(), 'reassigned', 'schedule_occurrence', occ.id,
    jsonb_build_object('assignee_id', assignee_id_value, 'local_date', occ.local_date));

  return occ;
end;
$$;

create or replace function public.uncomplete_occurrence(
  occurrence_id uuid
) returns public.schedule_occurrences
language plpgsql security definer set search_path = public as $$
declare
  occ public.schedule_occurrences;
begin
  select * into occ from public.schedule_occurrences where id = occurrence_id for update;
  if occ.id is null then raise exception 'occurrence_not_found'; end if;
  if occ.household_id is null or not public.is_household_member(occ.household_id) then
    raise exception 'household_access_denied';
  end if;
  if occ.completed_at is null then return occ; end if;

  update public.schedule_occurrences
  set completed_at = null, completed_by = null
  where id = occurrence_id returning * into occ;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (occ.household_id, auth.uid(), 'uncompleted', 'schedule_occurrence', occ.id,
    jsonb_build_object('local_date', occ.local_date));

  return occ;
end;
$$;

grant execute on function public.reassign_occurrence(uuid, uuid) to authenticated;
grant execute on function public.uncomplete_occurrence(uuid) to authenticated;

notify pgrst, 'reload schema';

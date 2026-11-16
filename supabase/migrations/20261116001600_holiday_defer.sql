-- Mode Cuti (holiday) + Defer occurrence
create table if not exists household_holidays (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
alter table household_holidays enable row level security;
create policy hh_holidays_read on household_holidays for select using (is_household_member(household_id));
create policy hh_holidays_write on household_holidays for all using (household_role(household_id) in ('owner','admin')) with check (household_role(household_id) in ('owner','admin'));

alter table schedule_occurrences add column if not exists deferred_until timestamptz;
alter table schedule_occurrences add column if not exists deferred_by uuid references auth.users(id) on delete set null;

create or replace function set_household_holiday(p_household_id uuid, p_start date, p_end date, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not (household_role(p_household_id) in ('owner','admin')) then
    raise exception 'holiday_admin_required';
  end if;
  if p_end < p_start then
    raise exception 'invalid_range';
  end if;
  insert into household_holidays (household_id, start_date, end_date, reason, created_by)
  values (p_household_id, p_start, p_end, p_reason, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function set_household_holiday(uuid,date,date,text) to authenticated;

create or replace function defer_occurrence(p_occurrence_id uuid, p_until timestamptz)
returns public.schedule_occurrences
language plpgsql
security definer
set search_path = public
as $$
declare v_occ public.schedule_occurrences;
  v_today date;
begin
  select * into v_occ from public.schedule_occurrences where id = p_occurrence_id for update;
  if v_occ.id is null then raise exception 'occurrence_not_found'; end if;
  if not is_household_member(v_occ.household_id) then raise exception 'household_access_denied'; end if;
  v_today := (now() at time zone coalesce((select timezone from households where id = v_occ.household_id),'Asia/Jakarta'))::date;
  if v_occ.local_date < v_today then raise exception 'cannot_defer_past'; end if;
  if v_occ.completed_at is not null or v_occ.archived_at is not null then raise exception 'cannot_defer_completed_or_archived'; end if;
  update public.schedule_occurrences set deferred_until = p_until, deferred_by = auth.uid() where id = p_occurrence_id returning * into v_occ;
  insert into audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_occ.household_id, auth.uid(), 'deferred', 'schedule_occurrence', v_occ.id, jsonb_build_object('until', p_until));
  return v_occ;
end;
$$;
grant execute on function defer_occurrence(uuid, timestamptz) to authenticated;
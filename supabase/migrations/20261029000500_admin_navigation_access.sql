-- Admin-only navigation is backed by the same household role used by RLS and
-- Edge Functions. Client route guards are only the UX layer.

drop policy if exists household_assignees_member_select on public.household_assignees;
create policy household_assignees_admin_select on public.household_assignees
  for select using (public.household_role(household_id) in ('owner', 'admin'));

drop policy if exists schedule_rotations_member_select on public.household_schedule_rotations;
create policy schedule_rotations_admin_select on public.household_schedule_rotations
  for select using (public.household_role(household_id) in ('owner', 'admin'));

drop policy if exists schedule_rotation_days_member_select on public.household_schedule_rotation_days;
create policy schedule_rotation_days_admin_select on public.household_schedule_rotation_days
  for select using (exists (
    select 1
    from public.household_schedule_rotations rotation
    where rotation.id = rotation_id
      and public.household_role(rotation.household_id) in ('owner', 'admin')
  ));

create or replace function public.get_household_schedule_rotation(requested_household_id uuid)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare result jsonb;
begin
  if public.household_role(requested_household_id) not in ('owner', 'admin') then
    raise exception 'household_admin_required';
  end if;
  select coalesce((
    select jsonb_build_object(
      'rotation', to_jsonb(rotation),
      'days', coalesce((select jsonb_agg(to_jsonb(rotation_day) order by rotation_day.weekday)
        from public.household_schedule_rotation_days rotation_day
        where rotation_day.rotation_id = rotation.id), '[]'::jsonb)
    )
    from public.household_schedule_rotations rotation
    where rotation.household_id = requested_household_id and rotation.is_active
  ), jsonb_build_object('rotation', null, 'days', '[]'::jsonb))
  into result;
  return result;
end;
$$;

create or replace function public.household_report(
  requested_household_id uuid,
  from_date date,
  to_date date,
  timezone_value text
) returns table (completed_total bigint, overdue_total bigint, scheduled_total bigint, completion_rate numeric)
language sql security invoker set search_path = public as $$
  select
    count(*) filter (where occurrence.completed_at is not null),
    count(*) filter (
      where occurrence.completed_at is null
        and occurrence.local_date < (now() at time zone coalesce(nullif(timezone_value, ''), 'Asia/Jakarta'))::date
    ),
    count(*),
    coalesce(round((count(*) filter (where occurrence.completed_at is not null)::numeric / nullif(count(*), 0)) * 100, 1), 0)
  from public.schedule_occurrences occurrence
  where occurrence.household_id = requested_household_id
    and public.household_role(requested_household_id) in ('owner', 'admin')
    and occurrence.local_date between from_date and to_date;
$$;

-- Keep the legacy three-argument RPC protected too while older clients are
-- still using the fallback signature.
create or replace function public.household_report(
  requested_household_id uuid,
  from_date date,
  to_date date
) returns table (completed_total bigint, overdue_total bigint, scheduled_total bigint, completion_rate numeric)
language sql security invoker set search_path = public as $$
  select
    count(*) filter (where occurrence.completed_at is not null),
    count(*) filter (where occurrence.completed_at is null and occurrence.local_date < current_date),
    count(*),
    coalesce(round((count(*) filter (where occurrence.completed_at is not null)::numeric / nullif(count(*), 0)) * 100, 1), 0)
  from public.schedule_occurrences occurrence
  where occurrence.household_id = requested_household_id
    and public.household_role(requested_household_id) in ('owner', 'admin')
    and occurrence.local_date between from_date and to_date;
$$;

create or replace function public.export_household_payload(target_household_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'household', (select to_jsonb(h) from public.households h where h.id = target_household_id),
    'members', coalesce((select jsonb_agg(to_jsonb(m)) from public.household_members m where m.household_id = target_household_id), '[]'::jsonb),
    'cats', coalesce((select jsonb_agg(to_jsonb(c)) from public.cats c where c.household_id = target_household_id), '[]'::jsonb),
    'litter_boxes', coalesce((select jsonb_agg(to_jsonb(l)) from public.litter_boxes l where l.household_id = target_household_id), '[]'::jsonb),
    'catalog_items', coalesce((select jsonb_agg(to_jsonb(i)) from public.catalog_items i where i.household_id = target_household_id), '[]'::jsonb),
    'schedules', coalesce((select jsonb_agg(to_jsonb(s)) from public.schedules s where s.household_id = target_household_id), '[]'::jsonb),
    'occurrences', coalesce((select jsonb_agg(to_jsonb(o)) from public.schedule_occurrences o where o.household_id = target_household_id), '[]'::jsonb),
    'audit_events', coalesce((select jsonb_agg(to_jsonb(a)) from public.audit_events a where a.household_id = target_household_id), '[]'::jsonb)
  );
$$;

create or replace function public.export_household()
returns jsonb language plpgsql security definer set search_path = public as $$
declare target_household_id uuid;
begin
  select household_id into target_household_id
  from public.household_members
  where user_id = auth.uid() and is_active
  order by joined_at
  limit 1;
  if target_household_id is null or public.household_role(target_household_id) not in ('owner', 'admin') then
    raise exception 'household_admin_required';
  end if;
  return public.export_household_payload(target_household_id);
end;
$$;

create or replace function public.export_household(requested_household_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if public.household_role(requested_household_id) not in ('owner', 'admin') then
    raise exception 'household_admin_required';
  end if;
  return public.export_household_payload(requested_household_id);
end;
$$;

revoke all on function public.export_household_payload(uuid) from public, anon, authenticated;
grant execute on function public.export_household() to authenticated;
grant execute on function public.export_household(uuid) to authenticated;

notify pgrst, 'reload schema';

-- Household hardening: keep onboarding/settings atomic, preserve schedule history,
-- and make the export/ownership contracts complete without trusting the client.

create or replace function public.create_household(
  household_name text,
  timezone_value text
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.households;
  normalized_timezone text := coalesce(nullif(trim(timezone_value), ''), 'Asia/Jakarta');
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if char_length(trim(household_name)) not between 1 and 120 then
    raise exception 'invalid_household_name';
  end if;
  if not exists (select 1 from pg_timezone_names where name = normalized_timezone) then
    raise exception 'invalid_timezone';
  end if;

  insert into public.households(name, timezone, created_by)
  values (trim(household_name), normalized_timezone, auth.uid())
  returning * into created;

  insert into public.household_members(household_id, user_id, role)
  values (created.id, auth.uid(), 'owner');
  return created;
end;
$$;

grant execute on function public.create_household(text, text) to authenticated;

create or replace function public.update_household_settings(
  requested_household_id uuid,
  household_name_value text,
  timezone_value text
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  current_household public.households;
  updated_household public.households;
  normalized_timezone text := coalesce(nullif(trim(timezone_value), ''), 'Asia/Jakarta');
  current_local_date date;
begin
  if public.household_role(requested_household_id) not in ('owner', 'admin') then
    raise exception 'household_admin_required';
  end if;
  if char_length(trim(household_name_value)) not between 1 and 120 then
    raise exception 'invalid_household_name';
  end if;
  if not exists (select 1 from pg_timezone_names where name = normalized_timezone) then
    raise exception 'invalid_timezone';
  end if;

  select * into current_household
  from public.households
  where id = requested_household_id
  for update;
  if current_household.id is null then raise exception 'household_not_found'; end if;
  current_local_date := (now() at time zone coalesce(nullif(current_household.timezone, ''), 'Asia/Jakarta'))::date;

  update public.households
  set name = trim(household_name_value), timezone = normalized_timezone
  where id = requested_household_id
  returning * into updated_household;

  update public.schedules
  set timezone = normalized_timezone,
      scheduled_at = case
        when scheduled_at >= now() then (
          (
            coalesce(start_date, (scheduled_at at time zone coalesce(nullif(current_household.timezone, ''), 'Asia/Jakarta'))::date)::text
            || ' ' || coalesce((select left(slot.local_time::text, 5) from public.schedule_slots slot where slot.schedule_id = schedules.id and slot.is_active order by slot.sort_order limit 1), '08:00')
          )::timestamp at time zone normalized_timezone
        )
        else scheduled_at
      end,
      updated_at = now()
  where household_id = requested_household_id;

  -- Only future, incomplete occurrences move to the new timezone. Past records
  -- remain immutable so audit/history never changes retroactively.
  update public.schedule_occurrences occurrence
  set scheduled_at = ((occurrence.local_date::text || ' ' || left(coalesce(slot.local_time::text, '00:00'), 5))::timestamp at time zone normalized_timezone)
  from public.schedule_slots slot
  where occurrence.slot_id = slot.id
    and occurrence.household_id = requested_household_id
    and occurrence.completed_at is null
    and occurrence.archived_at is null
    and occurrence.local_date >= current_local_date
    and occurrence.scheduled_at >= now();

  insert into public.audit_events(household_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    requested_household_id,
    auth.uid(),
    'updated',
    'household',
    requested_household_id,
    jsonb_build_object('changed_fields', jsonb_build_object(
      'name', jsonb_build_object('before', current_household.name, 'after', updated_household.name),
      'timezone', jsonb_build_object('before', current_household.timezone, 'after', updated_household.timezone)
    ))
  );
  return updated_household;
end;
$$;

grant execute on function public.update_household_settings(uuid, text, text) to authenticated;

create or replace function public.transfer_household_ownership(
  target_household_id uuid,
  target_user_id uuid
)
returns public.household_members
language plpgsql
security definer
set search_path = public
as $$
declare
  current_owner uuid := auth.uid();
  target_member public.household_members;
  result_member public.household_members;
begin
  if public.household_role(target_household_id) <> 'owner' then
    raise exception 'household_owner_required';
  end if;
  if target_user_id = current_owner then raise exception 'ownership_target_must_differ'; end if;

  select * into target_member
  from public.household_members
  where household_id = target_household_id
    and user_id = target_user_id
    and is_active
  for update;
  if target_member.user_id is null then raise exception 'ownership_target_not_member'; end if;

  update public.household_members
  set role = 'admin'
  where household_id = target_household_id and user_id = current_owner and is_active;
  update public.household_members
  set role = 'owner'
  where household_id = target_household_id and user_id = target_user_id
  returning * into result_member;

  insert into public.audit_events(household_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    target_household_id,
    current_owner,
    'ownership_transferred',
    'household_member',
    target_user_id,
    jsonb_build_object('previous_owner_id', current_owner, 'new_owner_id', target_user_id)
  );
  return result_member;
end;
$$;

grant execute on function public.transfer_household_ownership(uuid, uuid) to authenticated;

alter table public.catalog_items add column if not exists minimum_stock numeric(12,3) not null default 0;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_items_minimum_stock_nonnegative') then
    alter table public.catalog_items add constraint catalog_items_minimum_stock_nonnegative check (minimum_stock >= 0);
  end if;
end $$;

-- A schedule with occurrences is never hard-deleted. The caller must archive it,
-- keeping occurrence rows available for audit/report/export. Empty schedules can
-- still be permanently deleted as a true cleanup operation.
create or replace function public.delete_schedule(schedule_id_value uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  schedule_row public.schedules;
begin
  select s.* into schedule_row
  from public.schedules s
  where s.id = schedule_id_value
    and public.household_role(s.household_id) in ('owner', 'admin')
  for update;
  if schedule_row.id is null then raise exception 'schedule_not_found_or_forbidden'; end if;
  if exists (select 1 from public.schedule_occurrences where schedule_id = schedule_id_value) then
    raise exception 'schedule_has_history_archive_instead';
  end if;

  insert into public.audit_events(household_id, actor_id, action, entity_type, entity_id, metadata)
  values (schedule_row.household_id, auth.uid(), 'deleted', 'schedule', schedule_row.id,
    jsonb_build_object('title', schedule_row.title, 'status', schedule_row.status, 'occurrence_count', 0, 'permanent', true));
  delete from public.schedules where id = schedule_id_value;
  return true;
end;
$$;

grant execute on function public.delete_schedule(uuid) to authenticated;

create or replace function public.export_household_payload(target_household_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'schema_version', 2,
    'exported_at', now(),
    'household', (select to_jsonb(h) from public.households h where h.id = $1),
    'profiles', coalesce((select jsonb_agg(to_jsonb(p)) from public.profiles p where p.id in (select m.user_id from public.household_members m where m.household_id = $1)), '[]'::jsonb),
    'members', coalesce((select jsonb_agg(to_jsonb(m)) from public.household_members m where m.household_id = $1), '[]'::jsonb),
    'invitations', coalesce((select jsonb_agg(to_jsonb(i)) from public.household_invitations i where i.household_id = $1), '[]'::jsonb),
    'cats', coalesce((select jsonb_agg(to_jsonb(c)) from public.cats c where c.household_id = $1), '[]'::jsonb),
    'cat_attachments', coalesce((select jsonb_agg(to_jsonb(a)) from public.cat_attachments a where a.household_id = $1), '[]'::jsonb),
    'cat_health_records', coalesce((select jsonb_agg(to_jsonb(hr)) from public.cat_health_records hr where hr.household_id = $1), '[]'::jsonb),
    'cat_vaccinations', coalesce((select jsonb_agg(to_jsonb(cv)) from public.cat_vaccinations cv where cv.household_id = $1), '[]'::jsonb),
    'cat_scan_records', coalesce((select jsonb_agg(to_jsonb(sr)) from public.cat_scan_records sr where sr.household_id = $1), '[]'::jsonb),
    'food_products', coalesce((select jsonb_agg(to_jsonb(fp)) from public.food_products fp where fp.household_id = $1), '[]'::jsonb),
    'cat_food_profiles', coalesce((select jsonb_agg(to_jsonb(cf)) from public.cat_food_profiles cf where cf.household_id = $1), '[]'::jsonb),
    'cat_expenses', coalesce((select jsonb_agg(to_jsonb(ce)) from public.cat_expenses ce where ce.household_id = $1), '[]'::jsonb),
    'litter_boxes', coalesce((select jsonb_agg(to_jsonb(l)) from public.litter_boxes l where l.household_id = $1), '[]'::jsonb),
    'litter_box_cleanings', coalesce((select jsonb_agg(to_jsonb(lc)) from public.litter_box_cleanings lc where lc.household_id = $1), '[]'::jsonb),
    'catalog_items', coalesce((select jsonb_agg(to_jsonb(i)) from public.catalog_items i where i.household_id = $1), '[]'::jsonb),
    'catalog_stock_movements', coalesce((select jsonb_agg(to_jsonb(sm)) from public.catalog_stock_movements sm where sm.household_id = $1), '[]'::jsonb),
    'schedules', coalesce((select jsonb_agg(to_jsonb(s)) from public.schedules s where s.household_id = $1), '[]'::jsonb),
    'schedule_slots', coalesce((select jsonb_agg(to_jsonb(ss)) from public.schedule_slots ss where ss.schedule_id in (select s.id from public.schedules s where s.household_id = $1)), '[]'::jsonb),
    'schedule_targets', coalesce((select jsonb_agg(to_jsonb(st)) from public.schedule_targets st where st.schedule_id in (select s.id from public.schedules s where s.household_id = $1)), '[]'::jsonb),
    'schedule_occurrences', coalesce((select jsonb_agg(to_jsonb(o)) from public.schedule_occurrences o where o.household_id = $1), '[]'::jsonb),
    'household_assignees', coalesce((select jsonb_agg(to_jsonb(ha)) from public.household_assignees ha where ha.household_id = $1), '[]'::jsonb),
    'schedule_rotations', coalesce((select jsonb_agg(to_jsonb(sr)) from public.household_schedule_rotations sr where sr.household_id = $1), '[]'::jsonb),
    'schedule_rotation_days', coalesce((select jsonb_agg(to_jsonb(srd)) from public.household_schedule_rotation_days srd where srd.rotation_id in (select sr.id from public.household_schedule_rotations sr where sr.household_id = $1)), '[]'::jsonb),
    'notification_preferences', coalesce((select jsonb_agg(to_jsonb(np)) from public.notification_preferences np where np.household_id = $1), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(to_jsonb(n)) from public.notifications n where n.household_id = $1), '[]'::jsonb),
    'audit_events', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at) from public.audit_events a where a.household_id = $1), '[]'::jsonb)
  );
$$;

revoke all on function public.export_household_payload(uuid) from public, anon, authenticated;
grant execute on function public.export_household_payload(uuid) to service_role;

notify pgrst, 'reload schema';

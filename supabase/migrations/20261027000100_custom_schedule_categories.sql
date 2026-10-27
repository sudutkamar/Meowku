-- Custom schedule labels are still stored under the safe `other` system category.
-- The label is household data and is never used for authorization.
alter table public.schedules add column if not exists custom_category text;
alter table public.schedules drop constraint if exists schedules_custom_category_length;
alter table public.schedules add constraint schedules_custom_category_length check (custom_category is null or length(trim(custom_category)) between 1 and 80);

create or replace function public.create_schedule(
  title_value text, category_value text, custom_category_value text, scheduled_at_value timestamptz, household_id_value uuid,
  start_date_value date, end_date_value date, repeat_interval_value integer, repeat_unit_value text,
  timezone_value text, days_of_week_value smallint[], day_of_month_value smallint,
  last_day_value boolean, slots_value jsonb, targets_value jsonb
) returns public.schedules language plpgsql security definer set search_path = public as $$
declare created public.schedules; slot_record jsonb; target_record jsonb; slot_id_value uuid; normalized_custom_category text;
begin
  if auth.uid() is null then raise exception 'schedule_admin_required'; end if;
  if public.household_role(household_id_value) not in ('owner', 'admin') then raise exception 'schedule_admin_required'; end if;
  if nullif(trim(title_value), '') is null then raise exception 'invalid_schedule_title'; end if;
  if category_value not in ('feeding', 'litter', 'medicine', 'other') then raise exception 'invalid_schedule_category'; end if;
  normalized_custom_category := nullif(trim(custom_category_value), '');
  if category_value = 'other' and normalized_custom_category is null then raise exception 'invalid_custom_schedule_category'; end if;
  if category_value <> 'other' then normalized_custom_category := null; end if;
  if repeat_interval_value < 1 or repeat_unit_value not in ('day', 'week', 'month') then raise exception 'invalid_schedule_recurrence'; end if;
  if end_date_value is not null and end_date_value < start_date_value then raise exception 'invalid_schedule_range'; end if;
  if day_of_month_value is not null and (day_of_month_value < 1 or day_of_month_value > 31) then raise exception 'invalid_month_day'; end if;

  insert into public.schedules (title, category, custom_category, scheduled_at, household_id, owner_id, start_date, end_date, repeat_interval, repeat_unit, days_of_week, timezone, day_of_month, last_day, status, is_active)
  values (trim(title_value), category_value, normalized_custom_category, scheduled_at_value, household_id_value, auth.uid(), start_date_value, end_date_value, repeat_interval_value, repeat_unit_value, coalesce(days_of_week_value, '{}'), coalesce(nullif(trim(timezone_value), ''), 'Asia/Jakarta'), day_of_month_value, coalesce(last_day_value, false), 'active', true)
  returning * into created;

  for slot_record in select value from jsonb_array_elements(coalesce(nullif(slots_value, '[]'::jsonb), jsonb_build_array(jsonb_build_object('label', title_value, 'local_time', to_char(scheduled_at_value at time zone coalesce(nullif(trim(timezone_value), ''), 'Asia/Jakarta'), 'HH24:MI:SS'), 'sort_order', 0, 'is_active', true)))) loop
    insert into public.schedule_slots (schedule_id, label, local_time, sort_order, is_active)
    values (created.id, trim(slot_record->>'label'), (slot_record->>'local_time')::time, coalesce((slot_record->>'sort_order')::integer, 0), coalesce((slot_record->>'is_active')::boolean, true))
    returning id into slot_id_value;
  end loop;
  for target_record in select value from jsonb_array_elements(coalesce(targets_value, '[]'::jsonb)) loop
    insert into public.schedule_targets (schedule_id, target_key, cat_id, litter_box_id)
    values (created.id, target_record->>'target_key', nullif(target_record->>'cat_id', '')::uuid, nullif(target_record->>'litter_box_id', '')::uuid);
  end loop;
  perform public.generate_schedule_occurrences(created.household_id, created.start_date, coalesce(created.end_date, created.start_date));
  return created;
end;
$$;

create or replace function public.update_schedule_definition(schedule_id_value uuid, definition_value jsonb)
returns public.schedules language plpgsql security definer set search_path = public as $$
declare result public.schedules; slot_record jsonb; target_record jsonb; next_category text; normalized_custom_category text;
begin
  select s.* into result from public.schedules s where s.id = schedule_id_value and public.household_role(s.household_id) in ('owner', 'admin') for update;
  if result.id is null then raise exception 'schedule_not_found_or_forbidden'; end if;
  if result.status = 'archived' then raise exception 'archived_schedule_cannot_change'; end if;
  next_category := coalesce(definition_value->>'category', result.category);
  normalized_custom_category := nullif(trim(definition_value->>'custom_category'), '');
  if next_category = 'other' and normalized_custom_category is null then raise exception 'invalid_custom_schedule_category'; end if;
  if next_category <> 'other' then normalized_custom_category := null; end if;
  update public.schedules set title = coalesce(nullif(trim(definition_value->>'title'), ''), title),
    category = next_category, custom_category = normalized_custom_category, start_date = coalesce((definition_value->>'start_date')::date, start_date),
    end_date = case when definition_value ? 'end_date' then nullif(definition_value->>'end_date', '')::date else end_date end,
    repeat_interval = coalesce((definition_value->>'repeat_interval')::integer, repeat_interval), repeat_unit = coalesce(definition_value->>'repeat_unit', repeat_unit),
    days_of_week = coalesce((select array_agg(value::smallint order by value::smallint) from jsonb_array_elements_text(definition_value->'days_of_week')), days_of_week),
    day_of_month = case when definition_value ? 'day_of_month' then nullif(definition_value->>'day_of_month', '')::smallint else day_of_month end,
    last_day = coalesce((definition_value->>'last_day')::boolean, last_day), updated_at = now()
  where id = schedule_id_value returning * into result;
  if definition_value ? 'slots' then
    for slot_record in select value from jsonb_array_elements(definition_value->'slots') loop
      if nullif(slot_record->>'id', '') is not null then
        update public.schedule_slots set label = trim(slot_record->>'label'), local_time = (slot_record->>'local_time')::time, sort_order = (slot_record->>'sort_order')::integer, is_active = coalesce((slot_record->>'is_active')::boolean, true), updated_at = now() where id = (slot_record->>'id')::uuid and schedule_id = schedule_id_value;
      else
        insert into public.schedule_slots (schedule_id, label, local_time, sort_order, is_active) values (schedule_id_value, trim(slot_record->>'label'), (slot_record->>'local_time')::time, (slot_record->>'sort_order')::integer, coalesce((slot_record->>'is_active')::boolean, true));
      end if;
    end loop;
  end if;
  if definition_value ? 'targets' then
    update public.schedule_targets set is_active = false where schedule_id = schedule_id_value;
    for target_record in select value from jsonb_array_elements(definition_value->'targets') loop
      insert into public.schedule_targets (schedule_id, target_key, cat_id, litter_box_id, is_active)
      values (schedule_id_value, target_record->>'target_key', nullif(target_record->>'cat_id', '')::uuid, nullif(target_record->>'litter_box_id', '')::uuid, true)
      on conflict (schedule_id, target_key) do update set cat_id = excluded.cat_id, litter_box_id = excluded.litter_box_id, is_active = true;
    end loop;
  end if;
  return result;
end;
$$;

grant execute on function public.create_schedule(text, text, text, timestamptz, uuid, date, date, integer, text, text, smallint[], smallint, boolean, jsonb, jsonb) to authenticated;
grant execute on function public.update_schedule_definition(uuid, jsonb) to authenticated;

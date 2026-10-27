-- Keep the atomic create RPC behavior while removing an unused local from lint output.
create or replace function public.create_schedule(
  title_value text, category_value text, scheduled_at_value timestamptz, household_id_value uuid,
  start_date_value date, end_date_value date, repeat_interval_value integer, repeat_unit_value text,
  timezone_value text, days_of_week_value smallint[], day_of_month_value smallint,
  last_day_value boolean, slots_value jsonb, targets_value jsonb
) returns public.schedules language plpgsql security definer set search_path = public as $$
declare created public.schedules; slot_record jsonb; target_record jsonb;
begin
  if auth.uid() is null then raise exception 'schedule_admin_required'; end if;
  if public.household_role(household_id_value) not in ('owner', 'admin') then raise exception 'schedule_admin_required'; end if;
  if nullif(trim(title_value), '') is null then raise exception 'invalid_schedule_title'; end if;
  if category_value not in ('feeding', 'litter', 'medicine', 'other') then raise exception 'invalid_schedule_category'; end if;
  if repeat_interval_value < 1 or repeat_unit_value not in ('day', 'week', 'month') then raise exception 'invalid_schedule_recurrence'; end if;
  if end_date_value is not null and end_date_value < start_date_value then raise exception 'invalid_schedule_range'; end if;
  if day_of_month_value is not null and (day_of_month_value < 1 or day_of_month_value > 31) then raise exception 'invalid_month_day'; end if;

  insert into public.schedules (title, category, scheduled_at, household_id, owner_id, start_date, end_date, repeat_interval, repeat_unit, days_of_week, timezone, day_of_month, last_day, status, is_active)
  values (trim(title_value), category_value, scheduled_at_value, household_id_value, auth.uid(), start_date_value, end_date_value, repeat_interval_value, repeat_unit_value, coalesce(days_of_week_value, '{}'), coalesce(nullif(trim(timezone_value), ''), 'Asia/Jakarta'), day_of_month_value, coalesce(last_day_value, false), 'active', true)
  returning * into created;

  for slot_record in select value from jsonb_array_elements(coalesce(nullif(slots_value, '[]'::jsonb), jsonb_build_array(jsonb_build_object('label', title_value, 'local_time', to_char(scheduled_at_value at time zone coalesce(nullif(trim(timezone_value), ''), 'Asia/Jakarta'), 'HH24:MI:SS'), 'sort_order', 0, 'is_active', true)))) loop
    insert into public.schedule_slots (schedule_id, label, local_time, sort_order, is_active)
    values (created.id, trim(slot_record->>'label'), (slot_record->>'local_time')::time, coalesce((slot_record->>'sort_order')::integer, 0), coalesce((slot_record->>'is_active')::boolean, true));
  end loop;
  for target_record in select value from jsonb_array_elements(coalesce(targets_value, '[]'::jsonb)) loop
    insert into public.schedule_targets (schedule_id, target_key, cat_id, litter_box_id)
    values (created.id, target_record->>'target_key', nullif(target_record->>'cat_id', '')::uuid, nullif(target_record->>'litter_box_id', '')::uuid);
  end loop;
  perform public.generate_schedule_occurrences(created.household_id, created.start_date, coalesce(created.end_date, created.start_date));
  return created;
end;
$$;

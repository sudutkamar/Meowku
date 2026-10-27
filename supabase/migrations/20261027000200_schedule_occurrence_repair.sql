-- Repair schedule previews after edits and backfill idempotent future occurrences on demand.
-- Existing occurrence rows and completed history are preserved.

create or replace function public.update_schedule_definition(schedule_id_value uuid, definition_value jsonb)
returns public.schedules language plpgsql security definer set search_path = public as $$
declare result public.schedules; slot_record jsonb; target_record jsonb;
begin
  select s.* into result
  from public.schedules s
  where s.id = schedule_id_value
    and public.household_role(s.household_id) in ('owner', 'admin')
  for update;
  if result.id is null then raise exception 'schedule_not_found_or_forbidden'; end if;
  if result.status = 'archived' then raise exception 'archived_schedule_cannot_change'; end if;

  update public.schedules set
    title = coalesce(nullif(trim(definition_value->>'title'), ''), title),
    category = coalesce(definition_value->>'category', category),
    start_date = coalesce((definition_value->>'start_date')::date, start_date),
    end_date = case when definition_value ? 'end_date' then nullif(definition_value->>'end_date', '')::date else end_date end,
    repeat_interval = coalesce((definition_value->>'repeat_interval')::integer, repeat_interval),
    repeat_unit = coalesce(definition_value->>'repeat_unit', repeat_unit),
    days_of_week = coalesce((select array_agg(value::smallint order by value::smallint) from jsonb_array_elements_text(definition_value->'days_of_week')), days_of_week),
    day_of_month = case when definition_value ? 'day_of_month' then nullif(definition_value->>'day_of_month', '')::smallint else day_of_month end,
    last_day = coalesce((definition_value->>'last_day')::boolean, last_day),
    updated_at = now()
  where id = schedule_id_value
  returning * into result;

  if definition_value ? 'slots' then
    for slot_record in select value from jsonb_array_elements(definition_value->'slots') loop
      if nullif(slot_record->>'id', '') is not null then
        update public.schedule_slots set
          label = trim(slot_record->>'label'),
          local_time = (slot_record->>'local_time')::time,
          sort_order = (slot_record->>'sort_order')::integer,
          is_active = coalesce((slot_record->>'is_active')::boolean, true),
          updated_at = now()
        where id = (slot_record->>'id')::uuid and schedule_id = schedule_id_value;
      else
        insert into public.schedule_slots (schedule_id, label, local_time, sort_order, is_active)
        values (schedule_id_value, trim(slot_record->>'label'), (slot_record->>'local_time')::time, (slot_record->>'sort_order')::integer, coalesce((slot_record->>'is_active')::boolean, true));
      end if;
    end loop;
  end if;

  if definition_value ? 'targets' then
    update public.schedule_targets set is_active = false where schedule_id = schedule_id_value;
    for target_record in select value from jsonb_array_elements(definition_value->'targets') loop
      insert into public.schedule_targets (schedule_id, target_key, cat_id, litter_box_id, is_active)
      values (schedule_id_value, target_record->>'target_key', nullif(target_record->>'cat_id', '')::uuid, nullif(target_record->>'litter_box_id', '')::uuid, true)
      on conflict (schedule_id, target_key) do update set
        cat_id = excluded.cat_id,
        litter_box_id = excluded.litter_box_id,
        is_active = true;
    end loop;
  end if;

  -- This is idempotent and only inserts missing future rows; completed rows are untouched.
  perform public.generate_schedule_occurrences(
    result.household_id,
    result.start_date,
    coalesce(result.end_date, result.start_date)
  );
  return result;
end;
$$;

grant execute on function public.update_schedule_definition(uuid, jsonb) to authenticated;

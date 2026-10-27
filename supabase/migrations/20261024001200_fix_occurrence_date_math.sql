create or replace function public.generate_schedule_occurrences(
  requested_household_id uuid,
  range_start date,
  range_end date
) returns integer language plpgsql security invoker set search_path = public as $$
declare
  inserted_count integer := 0;
begin
  if not public.is_household_member(requested_household_id) then
    raise exception 'household_access_denied';
  end if;
  if range_end < range_start or range_end - range_start > 366 then
    raise exception 'invalid_date_range';
  end if;

  insert into public.schedule_occurrences (schedule_id, household_id, target_key, local_date, scheduled_at)
  select s.id, s.household_id, coalesce(t.target_key, 'household'), d.local_date::date,
    (d.local_date::date::text || ' 09:00:00')::timestamp at time zone coalesce(nullif(s.timezone, ''), 'Asia/Jakarta')
  from public.schedules s
  left join public.schedule_targets t on t.schedule_id = s.id
  cross join lateral generate_series(range_start, range_end, interval '1 day') as d(local_date)
  where s.household_id = requested_household_id and s.is_active
    and d.local_date::date >= coalesce(s.start_date, d.local_date::date)
    and d.local_date::date <= coalesce(s.end_date, d.local_date::date)
    and (
      (s.repeat_unit = 'day' and mod((d.local_date::date - coalesce(s.start_date, d.local_date::date)), s.repeat_interval) = 0)
      or (s.repeat_unit = 'week' and mod((d.local_date::date - coalesce(s.start_date, d.local_date::date)) / 7, s.repeat_interval) = 0
        and (cardinality(s.days_of_week) = 0 or extract(dow from d.local_date::date)::smallint = any(s.days_of_week)))
      or (s.repeat_unit = 'month' and extract(day from d.local_date::date) = extract(day from coalesce(s.start_date, d.local_date::date))
        and mod((extract(year from d.local_date::date)::integer * 12 + extract(month from d.local_date::date)::integer)
          - (extract(year from coalesce(s.start_date, d.local_date::date))::integer * 12 + extract(month from coalesce(s.start_date, d.local_date::date))::integer), s.repeat_interval) = 0)
    )
  on conflict (schedule_id, target_key, local_date) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- Monthly schedules created from a start/end window are anchored to the start day.
-- Pending occurrences that were generated from the wrong anchor are archived, never deleted.

create or replace function public.normalize_monthly_schedule_defaults()
returns trigger language plpgsql as $$
begin
  if new.repeat_unit = 'month' and not coalesce(new.last_day, false)
    and new.day_of_month is null and new.start_date is not null then
    new.day_of_month := extract(day from new.start_date)::smallint;
  end if;
  return new;
end;
$$;

drop trigger if exists schedules_monthly_anchor_defaults on public.schedules;
create trigger schedules_monthly_anchor_defaults
before insert or update of repeat_unit, start_date, day_of_month, last_day on public.schedules
for each row execute function public.normalize_monthly_schedule_defaults();

-- The UI calculates a one-month window as start date through the day before
-- the same date next month. Normalize those legacy rows to that same anchor.
update public.schedules
set day_of_month = extract(day from start_date)::smallint,
    updated_at = now()
where repeat_unit = 'month'
  and not coalesce(last_day, false)
  and start_date is not null
  and end_date = ((start_date + interval '1 month')::date - 1);

update public.schedule_occurrences occurrence
set archived_at = coalesce(occurrence.archived_at, now())
from public.schedules schedule_row
where occurrence.schedule_id = schedule_row.id
  and schedule_row.repeat_unit = 'month'
  and schedule_row.status <> 'archived'
  and occurrence.completed_at is null
  and occurrence.archived_at is null
  and not public.schedule_is_due(schedule_row, occurrence.local_date);

insert into public.schedule_occurrences (schedule_id, household_id, target_key, slot_id, local_date, scheduled_at)
select s.id,
  s.household_id,
  coalesce(t.target_key, 'household'),
  slot.id,
  candidate.local_date,
  ((candidate.local_date::date + slot.local_time)
    at time zone coalesce(nullif(s.timezone, ''), 'Asia/Jakarta'))
from public.schedules s
join public.schedule_slots slot on slot.schedule_id = s.id and slot.is_active
left join public.schedule_targets t on t.schedule_id = s.id and t.is_active
cross join lateral generate_series(s.start_date, coalesce(s.end_date, s.start_date), interval '1 day') as candidate(local_date)
where s.repeat_unit = 'month' and s.status = 'active' and s.is_active
  and public.schedule_is_due(s, candidate.local_date::date)
on conflict (schedule_id, target_key, local_date, slot_id) do nothing;

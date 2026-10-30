-- A finite one-month date range represents a daily plan in the product UX.
-- Older records stored that duration as repeat_unit = 'month', which made
-- the generator create only the anchor day. Normalize those records and all
-- future writes while preserving existing occurrence history.

create or replace function public.normalize_month_range_schedule()
returns trigger
language plpgsql
as $$
begin
  if new.repeat_unit = 'month'
     and coalesce(new.repeat_interval, 1) = 1
     and new.start_date is not null
     and new.end_date is not null
     and new.end_date > new.start_date
     and new.end_date <= (new.start_date + interval '1 month')::date then
    new.repeat_unit := 'day';
    new.repeat_interval := 1;
    new.days_of_week := '{}';
    new.day_of_month := null;
    new.last_day := false;
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_month_range_schedule_trigger on public.schedules;
create trigger normalize_month_range_schedule_trigger
before insert or update of start_date, end_date, repeat_interval, repeat_unit, days_of_week, day_of_month, last_day
on public.schedules
for each row execute function public.normalize_month_range_schedule();

update public.schedules
set repeat_unit = 'day',
    repeat_interval = 1,
    days_of_week = '{}',
    day_of_month = null,
    last_day = false,
    updated_at = now()
where repeat_unit = 'month'
  and repeat_interval = 1
  and start_date is not null
  and end_date is not null
  and end_date > start_date
  and end_date <= (start_date + interval '1 month')::date;

notify pgrst, 'reload schema';

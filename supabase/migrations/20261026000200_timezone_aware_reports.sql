-- Phase 1/2: report overdue calculations must use the household timezone,
-- never the database server timezone.
create or replace function public.household_report(
  requested_household_id uuid,
  from_date date,
  to_date date,
  timezone_value text
) returns table (completed_total bigint, overdue_total bigint, scheduled_total bigint, completion_rate numeric)
language sql
security invoker
set search_path = public
as $$
  select
    count(*) filter (where o.completed_at is not null),
    count(*) filter (
      where o.completed_at is null
        and o.local_date < (now() at time zone coalesce(nullif(timezone_value, ''), 'Asia/Jakarta'))::date
    ),
    count(*),
    coalesce(round((count(*) filter (where o.completed_at is not null)::numeric / nullif(count(*), 0)) * 100, 1), 0)
  from public.schedule_occurrences o
  where o.household_id = requested_household_id
    and public.is_household_member(requested_household_id)
    and o.local_date between from_date and to_date;
$$;

grant execute on function public.household_report(uuid, date, date, text) to authenticated;

-- Keep the schedule anchor and future incomplete occurrences in sync when a
-- slot time is edited. Completed/past history remains immutable.
create or replace function public.sync_schedule_slot_time_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_schedule_id uuid := new.schedule_id;
  first_slot_time time;
  schedule_timezone text;
  schedule_start_date date;
begin
  select
    coalesce(nullif(s.timezone, ''), 'Asia/Jakarta'),
    coalesce(s.start_date, (s.scheduled_at at time zone coalesce(nullif(s.timezone, ''), 'Asia/Jakarta'))::date)
  into schedule_timezone, schedule_start_date
  from public.schedules s
  where s.id = affected_schedule_id;

  select slot.local_time
  into first_slot_time
  from public.schedule_slots slot
  where slot.schedule_id = affected_schedule_id
    and slot.is_active
  order by slot.sort_order, slot.local_time
  limit 1;

  if first_slot_time is not null then
    update public.schedules
    set scheduled_at = ((schedule_start_date::text || ' ' || first_slot_time::text)::timestamp at time zone schedule_timezone),
        updated_at = now()
    where id = affected_schedule_id;

    update public.schedule_occurrences o
    set scheduled_at = ((o.local_date::text || ' ' || slot.local_time::text)::timestamp at time zone schedule_timezone)
    from public.schedule_slots slot
    where o.schedule_id = affected_schedule_id
      and o.slot_id = slot.id
      and slot.schedule_id = affected_schedule_id
      and o.completed_at is null
      and o.archived_at is null
      and o.local_date >= (now() at time zone schedule_timezone)::date;
  end if;

  return new;
end;
$$;

drop trigger if exists schedule_slot_time_metadata_sync on public.schedule_slots;
create trigger schedule_slot_time_metadata_sync
after insert or update of local_time, sort_order, is_active on public.schedule_slots
for each row execute function public.sync_schedule_slot_time_metadata();

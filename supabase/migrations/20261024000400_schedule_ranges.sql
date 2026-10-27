alter table public.schedules add column if not exists start_date date;
alter table public.schedules add column if not exists end_date date;
alter table public.schedules add column if not exists repeat_interval integer not null default 1 check (repeat_interval > 0);
alter table public.schedules add column if not exists repeat_unit text not null default 'day' check (repeat_unit in ('day','week','month'));
alter table public.schedules add column if not exists days_of_week smallint[] not null default '{}';
alter table public.schedules add column if not exists timezone text not null default 'Asia/Jakarta';

update public.schedules
set start_date = (scheduled_at at time zone 'Asia/Jakarta')::date,
    end_date = (scheduled_at at time zone 'Asia/Jakarta')::date
where start_date is null or end_date is null;

alter table public.schedules add constraint schedules_valid_range check (end_date is null or start_date is null or end_date >= start_date);
create index if not exists schedules_owner_range_idx on public.schedules(owner_id, start_date, end_date);

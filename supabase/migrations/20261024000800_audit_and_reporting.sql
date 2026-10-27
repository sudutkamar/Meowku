-- Task 6: append-only audit history and database-backed report aggregates.
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_household_created_idx on public.audit_events(household_id, created_at desc);
alter table public.audit_events enable row level security;
drop policy if exists audit_events_member_select on public.audit_events;
create policy audit_events_member_select on public.audit_events for select using (public.is_household_member(household_id));
drop policy if exists audit_events_member_insert on public.audit_events;
create policy audit_events_member_insert on public.audit_events for insert with check (public.is_household_member(household_id) and actor_id = auth.uid());

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_events_are_immutable';
end;
$$;
drop trigger if exists audit_events_immutable on public.audit_events;
create trigger audit_events_immutable before update or delete on public.audit_events for each row execute function public.prevent_audit_mutation();

create or replace function public.complete_occurrence(
  occurrence_id uuid,
  completed_at_value timestamptz default now(),
  note_value text default ''
) returns public.schedule_occurrences language plpgsql security invoker set search_path = public as $$
declare occurrence public.schedule_occurrences;
begin
  update public.schedule_occurrences o
  set completed_at = completed_at_value, completed_by = auth.uid(), note = coalesce(note_value, '')
  where o.id = occurrence_id and public.is_household_member(o.household_id)
  returning o.* into occurrence;
  if occurrence.id is null then raise exception 'occurrence_not_found'; end if;
  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (occurrence.household_id, auth.uid(), 'completed', 'schedule_occurrence', occurrence.id,
    jsonb_build_object('schedule_id', occurrence.schedule_id, 'target_key', occurrence.target_key, 'note', occurrence.note));
  return occurrence;
end;
$$;

create or replace function public.household_report(
  requested_household_id uuid,
  from_date date,
  to_date date
) returns table (completed_total bigint, overdue_total bigint, scheduled_total bigint, completion_rate numeric)
language sql security invoker set search_path = public as $$
  select
    count(*) filter (where o.completed_at is not null),
    count(*) filter (where o.completed_at is null and o.local_date < current_date),
    count(*),
    coalesce(round((count(*) filter (where o.completed_at is not null)::numeric / nullif(count(*), 0)) * 100, 1), 0)
  from public.schedule_occurrences o
  where o.household_id = requested_household_id
    and public.is_household_member(requested_household_id)
    and o.local_date between from_date and to_date;
$$;

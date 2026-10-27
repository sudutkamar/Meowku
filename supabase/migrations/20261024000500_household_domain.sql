create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  category text not null default 'other',
  notes text not null default '',
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cats add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.litter_boxes add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.schedules add column if not exists household_id uuid references public.households(id) on delete cascade;

create table if not exists public.schedule_targets (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  cat_id uuid references public.cats(id) on delete cascade,
  litter_box_id uuid references public.litter_boxes(id) on delete cascade,
  unique (schedule_id, cat_id, litter_box_id),
  check (cat_id is not null or litter_box_id is not null)
);

create table if not exists public.schedule_occurrences (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  target_key text not null,
  local_date date not null,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (schedule_id, target_key, local_date)
);

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

create index if not exists cats_household_id_idx on public.cats(household_id);
create index if not exists litter_boxes_household_id_idx on public.litter_boxes(household_id);
create index if not exists schedules_household_id_idx on public.schedules(household_id);
create index if not exists occurrences_household_date_idx on public.schedule_occurrences(household_id, local_date);
create index if not exists audit_events_household_created_idx on public.audit_events(household_id, created_at desc);

alter table public.catalog_items enable row level security;
alter table public.schedule_targets enable row level security;
alter table public.schedule_occurrences enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists catalog_items_member on public.catalog_items;
create policy catalog_items_member on public.catalog_items
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

drop policy if exists schedule_targets_member on public.schedule_targets;
create policy schedule_targets_member on public.schedule_targets
  for all using (exists (select 1 from public.schedules s where s.id = schedule_id and public.is_household_member(s.household_id)))
  with check (exists (select 1 from public.schedules s where s.id = schedule_id and public.is_household_member(s.household_id)));

drop policy if exists schedule_occurrences_member on public.schedule_occurrences;
create policy schedule_occurrences_member on public.schedule_occurrences
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

drop policy if exists audit_events_member_select on public.audit_events;
create policy audit_events_member_select on public.audit_events
  for select using (public.is_household_member(household_id));

drop policy if exists audit_events_member_insert on public.audit_events;
create policy audit_events_member_insert on public.audit_events
  for insert with check (public.is_household_member(household_id) and actor_id = auth.uid());

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_events_are_immutable';
end;
$$;

drop trigger if exists audit_events_immutable on public.audit_events;
create trigger audit_events_immutable
  before update or delete on public.audit_events
  for each row execute function public.prevent_audit_mutation();

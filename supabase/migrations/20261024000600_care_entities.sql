-- Task 4: household-scoped care entities.
alter table public.cats add column if not exists is_active boolean not null default true;
alter table public.litter_boxes add column if not exists is_active boolean not null default true;
alter table public.litter_boxes add column if not exists updated_at timestamptz not null default now();

update public.cats c
set household_id = hm.household_id
from public.household_members hm
where c.household_id is null and hm.user_id = c.owner_id and hm.is_active = true;

update public.litter_boxes l
set household_id = hm.household_id
from public.household_members hm
where l.household_id is null and hm.user_id = l.owner_id and hm.is_active = true;

-- Legacy rows may not have a household yet. Keep them inaccessible through RLS
-- until their owner completes onboarding and explicitly assigns them.

create index if not exists cats_household_active_name_idx on public.cats(household_id, is_active, name);
create index if not exists litter_boxes_household_active_name_idx on public.litter_boxes(household_id, is_active, name);
create index if not exists catalog_items_household_active_name_idx on public.catalog_items(household_id, is_active, name);

create or replace function public.set_care_entity_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cats_updated_at on public.cats;
create trigger cats_updated_at before update on public.cats for each row execute function public.set_care_entity_updated_at();
drop trigger if exists litter_boxes_updated_at on public.litter_boxes;
create trigger litter_boxes_updated_at before update on public.litter_boxes for each row execute function public.set_care_entity_updated_at();
drop trigger if exists catalog_items_updated_at on public.catalog_items;
create trigger catalog_items_updated_at before update on public.catalog_items for each row execute function public.set_care_entity_updated_at();

alter table public.cats enable row level security;
alter table public.litter_boxes enable row level security;
alter table public.catalog_items enable row level security;

drop policy if exists "own cats" on public.cats;
drop policy if exists cats_member on public.cats;
create policy cats_member on public.cats
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and owner_id = auth.uid());

drop policy if exists "own litter boxes" on public.litter_boxes;
drop policy if exists litter_boxes_member on public.litter_boxes;
create policy litter_boxes_member on public.litter_boxes
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and owner_id = auth.uid());

drop policy if exists catalog_items_member on public.catalog_items;
create policy catalog_items_member on public.catalog_items
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and created_by = auth.uid());

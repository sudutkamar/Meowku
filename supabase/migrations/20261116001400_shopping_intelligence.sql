alter table catalog_items add column if not exists low_stock_threshold numeric;
alter table catalog_items add column if not exists target_quantity numeric;
create table if not exists household_shopping_list (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  catalog_item_id uuid not null references catalog_items(id) on delete cascade,
  quantity_needed numeric not null,
  reason text not null check (reason in ('forecast','threshold','manual')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table household_shopping_list enable row level security;
create policy hsl_read on household_shopping_list for select using (is_household_member(household_id));
create policy hsl_write on household_shopping_list for all using (household_role(household_id) in ('owner','admin')) with check (household_role(household_id) in ('owner','admin'));
create or replace function compute_consumption_rate(p_household_id uuid) returns jsonb language sql security definer set search_path=public as $$ select jsonb_build_object('ok',true); $$;
create or replace function refresh_shopping_list(p_household_id uuid) returns jsonb language sql security definer set search_path=public as $$ select jsonb_build_object('ok',true); $$;

-- Operational care logs and inventory movements.
-- All writes are household-scoped and user-attributed; no client supplied
-- household or role is trusted for authorization.

create table if not exists public.litter_box_cleanings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  litter_box_id uuid not null references public.litter_boxes(id) on delete cascade,
  cleaned_by uuid not null references auth.users(id),
  cleaned_at timestamptz not null default now(),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists litter_box_cleanings_household_date_idx
  on public.litter_box_cleanings(household_id, cleaned_at desc);
create index if not exists litter_box_cleanings_box_date_idx
  on public.litter_box_cleanings(litter_box_id, cleaned_at desc);

alter table public.litter_box_cleanings enable row level security;
drop policy if exists litter_box_cleanings_member_select on public.litter_box_cleanings;
create policy litter_box_cleanings_member_select on public.litter_box_cleanings
  for select using (public.is_household_member(household_id));
drop policy if exists litter_box_cleanings_member_insert on public.litter_box_cleanings;
create policy litter_box_cleanings_member_insert on public.litter_box_cleanings
  for insert with check (public.is_household_member(household_id) and cleaned_by = auth.uid());

create or replace function public.mark_litter_box_cleaned(
  requested_household_id uuid,
  litter_box_id_value uuid,
  cleaned_at_value timestamptz default now(),
  note_value text default ''
) returns public.litter_boxes
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned public.litter_boxes;
begin
  if not public.is_household_member(requested_household_id) then
    raise exception 'household_access_denied';
  end if;
  if cleaned_at_value > now() + interval '5 minutes' then
    raise exception 'cleaned_at_in_future';
  end if;

  select * into cleaned
  from public.litter_boxes
  where id = litter_box_id_value
    and household_id = requested_household_id
    and is_active
  for update;
  if cleaned.id is null then raise exception 'litter_box_not_found'; end if;

  update public.litter_boxes
  set status = 'clean', last_cleaned_at = cleaned_at_value, updated_at = now()
  where id = cleaned.id
  returning * into cleaned;

  insert into public.litter_box_cleanings(household_id, litter_box_id, cleaned_by, cleaned_at, note)
  values (requested_household_id, cleaned.id, auth.uid(), cleaned_at_value, coalesce(trim(note_value), ''));

  insert into public.audit_events(household_id, actor_id, action, entity_type, entity_id, metadata)
  values (requested_household_id, auth.uid(), 'cleaned', 'litter_box', cleaned.id,
    jsonb_build_object('cleaned_at', cleaned_at_value, 'note', coalesce(trim(note_value), '')));
  return cleaned;
end;
$$;

grant execute on function public.mark_litter_box_cleaned(uuid, uuid, timestamptz, text) to authenticated;

alter table public.catalog_items add column if not exists stock_quantity numeric(12,3) not null default 0;
alter table public.catalog_items add column if not exists stock_unit text not null default 'unit';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_items_stock_nonnegative') then
    alter table public.catalog_items add constraint catalog_items_stock_nonnegative check (stock_quantity >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'catalog_items_stock_unit_valid') then
    alter table public.catalog_items add constraint catalog_items_stock_unit_valid check (char_length(trim(stock_unit)) between 1 and 24);
  end if;
end $$;

create table if not exists public.catalog_stock_movements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'out', 'adjustment')),
  quantity numeric(12,3) not null,
  previous_quantity numeric(12,3) not null,
  next_quantity numeric(12,3) not null check (next_quantity >= 0),
  note text not null default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check ((movement_type = 'adjustment' and quantity >= 0) or (movement_type in ('in', 'out') and quantity > 0))
);

create index if not exists catalog_stock_movements_household_date_idx
  on public.catalog_stock_movements(household_id, created_at desc);
create index if not exists catalog_stock_movements_item_date_idx
  on public.catalog_stock_movements(catalog_item_id, created_at desc);

alter table public.catalog_stock_movements enable row level security;
drop policy if exists catalog_stock_movements_member_select on public.catalog_stock_movements;
create policy catalog_stock_movements_member_select on public.catalog_stock_movements
  for select using (public.is_household_member(household_id));

create or replace function public.prevent_catalog_stock_direct_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.stock_quantity is distinct from old.stock_quantity
     and coalesce(current_setting('meowku.catalog_stock_update', true), 'off') <> 'on' then
    raise exception 'catalog_stock_must_use_movement_rpc';
  end if;
  return new;
end;
$$;

drop trigger if exists catalog_stock_direct_update on public.catalog_items;
create trigger catalog_stock_direct_update
  before update on public.catalog_items
  for each row execute function public.prevent_catalog_stock_direct_update();

create or replace function public.record_catalog_stock_movement(
  requested_household_id uuid,
  catalog_item_id_value uuid,
  movement_type_value text,
  quantity_value numeric,
  note_value text default ''
) returns public.catalog_items
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.catalog_items;
  previous_value numeric(12,3);
  next_value numeric(12,3);
begin
  if public.household_role(requested_household_id) not in ('owner', 'admin') then
    raise exception 'household_admin_required';
  end if;
  if movement_type_value not in ('in', 'out', 'adjustment') then raise exception 'invalid_stock_movement'; end if;
  if movement_type_value in ('in', 'out') and quantity_value <= 0 then raise exception 'stock_quantity_must_be_positive'; end if;
  if movement_type_value = 'adjustment' and quantity_value < 0 then raise exception 'stock_quantity_must_not_be_negative'; end if;

  select * into item
  from public.catalog_items
  where id = catalog_item_id_value and household_id = requested_household_id and is_active
  for update;
  if item.id is null then raise exception 'catalog_item_not_found'; end if;

  previous_value := item.stock_quantity;
  next_value := case
    when movement_type_value = 'in' then previous_value + quantity_value
    when movement_type_value = 'out' then previous_value - quantity_value
    else quantity_value
  end;
  if next_value < 0 then raise exception 'stock_cannot_be_negative'; end if;

  perform set_config('meowku.catalog_stock_update', 'on', true);
  update public.catalog_items
  set stock_quantity = next_value, updated_at = now()
  where id = item.id
  returning * into item;

  insert into public.catalog_stock_movements(
    household_id, catalog_item_id, movement_type, quantity,
    previous_quantity, next_quantity, note, created_by
  ) values (
    requested_household_id, item.id, movement_type_value, quantity_value,
    previous_value, next_value, coalesce(trim(note_value), ''), auth.uid()
  );

  insert into public.audit_events(household_id, actor_id, action, entity_type, entity_id, metadata)
  values (requested_household_id, auth.uid(), 'stock_moved', 'catalog_item', item.id,
    jsonb_build_object('movement_type', movement_type_value, 'quantity', quantity_value, 'previous_quantity', previous_value, 'next_quantity', next_value));
  return item;
end;
$$;

grant execute on function public.record_catalog_stock_movement(uuid, uuid, text, numeric, text) to authenticated;

create or replace function public.audit_care_entity_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  household_value uuid;
  entity_value uuid;
  action_value text;
  entity_type_value text;
  actor_value uuid := auth.uid();
begin
  if actor_value is null then return coalesce(new, old); end if;
  if tg_op = 'DELETE' then
    household_value := old.household_id;
    entity_value := old.id;
  else
    household_value := new.household_id;
    entity_value := new.id;
  end if;
  if household_value is null then return coalesce(new, old); end if;

  action_value := lower(tg_op);
  if tg_op = 'UPDATE'
     and (to_jsonb(new)->>'is_active') = 'false'
     and (to_jsonb(old)->>'is_active') = 'true' then
    action_value := 'archived';
  end if;
  entity_type_value := case tg_table_name
    when 'cats' then 'cat'
    when 'litter_boxes' then 'litter_box'
    when 'catalog_items' then 'catalog_item'
    when 'cat_health_records' then 'cat_health_record'
    when 'cat_vaccinations' then 'cat_vaccination'
    when 'cat_food_profiles' then 'cat_food_profile'
    when 'cat_expenses' then 'cat_expense'
    when 'food_products' then 'food_product'
    when 'cat_attachments' then 'cat_attachment'
    when 'cat_scan_records' then 'cat_scan_record'
    else tg_table_name
  end;

  insert into public.audit_events(household_id, actor_id, action, entity_type, entity_id, metadata)
  values (household_value, actor_value, action_value, entity_type_value, entity_value,
    jsonb_build_object('source_table', tg_table_name));
  return coalesce(new, old);
end;
$$;

drop trigger if exists cats_audit_change on public.cats;
create trigger cats_audit_change after insert or update or delete on public.cats for each row execute function public.audit_care_entity_change();
drop trigger if exists litter_boxes_audit_change on public.litter_boxes;
create trigger litter_boxes_audit_change after insert or update or delete on public.litter_boxes for each row execute function public.audit_care_entity_change();
drop trigger if exists catalog_items_audit_change on public.catalog_items;
create trigger catalog_items_audit_change after insert or update or delete on public.catalog_items for each row execute function public.audit_care_entity_change();
drop trigger if exists cat_health_records_audit_change on public.cat_health_records;
create trigger cat_health_records_audit_change after insert or update or delete on public.cat_health_records for each row execute function public.audit_care_entity_change();
drop trigger if exists cat_vaccinations_audit_change on public.cat_vaccinations;
create trigger cat_vaccinations_audit_change after insert or update or delete on public.cat_vaccinations for each row execute function public.audit_care_entity_change();
drop trigger if exists cat_food_profiles_audit_change on public.cat_food_profiles;
create trigger cat_food_profiles_audit_change after insert or update or delete on public.cat_food_profiles for each row execute function public.audit_care_entity_change();
drop trigger if exists cat_expenses_audit_change on public.cat_expenses;
create trigger cat_expenses_audit_change after insert or update or delete on public.cat_expenses for each row execute function public.audit_care_entity_change();
drop trigger if exists food_products_audit_change on public.food_products;
create trigger food_products_audit_change after insert or update or delete on public.food_products for each row execute function public.audit_care_entity_change();
drop trigger if exists cat_attachments_audit_change on public.cat_attachments;
create trigger cat_attachments_audit_change after insert or update or delete on public.cat_attachments for each row execute function public.audit_care_entity_change();
drop trigger if exists cat_scan_records_audit_change on public.cat_scan_records;
create trigger cat_scan_records_audit_change after insert or update or delete on public.cat_scan_records for each row execute function public.audit_care_entity_change();

create or replace function public.export_household_payload(target_household_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'household', (select to_jsonb(h) from public.households h where h.id = target_household_id),
    'members', coalesce((select jsonb_agg(to_jsonb(m)) from public.household_members m where m.household_id = target_household_id), '[]'::jsonb),
    'cats', coalesce((select jsonb_agg(to_jsonb(c)) from public.cats c where c.household_id = target_household_id), '[]'::jsonb),
    'litter_boxes', coalesce((select jsonb_agg(to_jsonb(l)) from public.litter_boxes l where l.household_id = target_household_id), '[]'::jsonb),
    'litter_box_cleanings', coalesce((select jsonb_agg(to_jsonb(lc)) from public.litter_box_cleanings lc where lc.household_id = target_household_id), '[]'::jsonb),
    'catalog_items', coalesce((select jsonb_agg(to_jsonb(i)) from public.catalog_items i where i.household_id = target_household_id), '[]'::jsonb),
    'catalog_stock_movements', coalesce((select jsonb_agg(to_jsonb(sm)) from public.catalog_stock_movements sm where sm.household_id = target_household_id), '[]'::jsonb),
    'food_products', coalesce((select jsonb_agg(to_jsonb(fp)) from public.food_products fp where fp.household_id = target_household_id), '[]'::jsonb),
    'cat_health_records', coalesce((select jsonb_agg(to_jsonb(hr)) from public.cat_health_records hr where hr.household_id = target_household_id), '[]'::jsonb),
    'cat_vaccinations', coalesce((select jsonb_agg(to_jsonb(cv)) from public.cat_vaccinations cv where cv.household_id = target_household_id), '[]'::jsonb),
    'cat_food_profiles', coalesce((select jsonb_agg(to_jsonb(cf)) from public.cat_food_profiles cf where cf.household_id = target_household_id), '[]'::jsonb),
    'cat_expenses', coalesce((select jsonb_agg(to_jsonb(ce)) from public.cat_expenses ce where ce.household_id = target_household_id), '[]'::jsonb),
    'schedules', coalesce((select jsonb_agg(to_jsonb(s)) from public.schedules s where s.household_id = target_household_id), '[]'::jsonb),
    'occurrences', coalesce((select jsonb_agg(to_jsonb(o)) from public.schedule_occurrences o where o.household_id = target_household_id), '[]'::jsonb),
    'audit_events', coalesce((select jsonb_agg(to_jsonb(a)) from public.audit_events a where a.household_id = target_household_id), '[]'::jsonb)
  );
$$;

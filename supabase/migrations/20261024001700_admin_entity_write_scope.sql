-- Admins may manage household entities created by other members.
drop policy if exists cats_admin_manage on public.cats;
create policy cats_admin_insert on public.cats for insert
  with check (public.household_role(household_id) in ('owner', 'admin') and owner_id = auth.uid());
create policy cats_admin_update on public.cats for update
  using (public.household_role(household_id) in ('owner', 'admin'))
  with check (public.household_role(household_id) in ('owner', 'admin'));
create policy cats_admin_delete on public.cats for delete
  using (public.household_role(household_id) in ('owner', 'admin'));

drop policy if exists litter_boxes_admin_manage on public.litter_boxes;
create policy litter_boxes_admin_insert on public.litter_boxes for insert
  with check (public.household_role(household_id) in ('owner', 'admin') and owner_id = auth.uid());
create policy litter_boxes_admin_update on public.litter_boxes for update
  using (public.household_role(household_id) in ('owner', 'admin'))
  with check (public.household_role(household_id) in ('owner', 'admin'));
create policy litter_boxes_admin_delete on public.litter_boxes for delete
  using (public.household_role(household_id) in ('owner', 'admin'));

drop policy if exists catalog_items_admin_manage on public.catalog_items;
create policy catalog_items_admin_insert on public.catalog_items for insert
  with check (public.household_role(household_id) in ('owner', 'admin') and created_by = auth.uid());
create policy catalog_items_admin_update on public.catalog_items for update
  using (public.household_role(household_id) in ('owner', 'admin'))
  with check (public.household_role(household_id) in ('owner', 'admin'));
create policy catalog_items_admin_delete on public.catalog_items for delete
  using (public.household_role(household_id) in ('owner', 'admin'));

drop policy if exists schedules_admin_manage on public.schedules;
create policy schedules_admin_insert on public.schedules for insert
  with check (public.household_role(household_id) in ('owner', 'admin') and owner_id = auth.uid());
create policy schedules_admin_update on public.schedules for update
  using (public.household_role(household_id) in ('owner', 'admin'))
  with check (public.household_role(household_id) in ('owner', 'admin'));
create policy schedules_admin_delete on public.schedules for delete
  using (public.household_role(household_id) in ('owner', 'admin'));

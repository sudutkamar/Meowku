-- Care/food/expense tables previously granted FOR ALL to every household member.
-- Split into per-command policies: any member reads, the creator writes their
-- own rows, and only the creator or owner/admin may modify or remove records.

drop policy if exists cat_attachments_member on public.cat_attachments;
drop policy if exists cat_health_records_member on public.cat_health_records;
drop policy if exists cat_vaccinations_member on public.cat_vaccinations;
drop policy if exists food_products_member on public.food_products;
drop policy if exists cat_food_profiles_member on public.cat_food_profiles;
drop policy if exists cat_expenses_member on public.cat_expenses;
drop policy if exists cat_scan_records_member on public.cat_scan_records;

create policy cat_attachments_member_select on public.cat_attachments for select
  using (public.is_household_member(household_id));
create policy cat_attachments_member_insert on public.cat_attachments for insert
  with check (public.is_household_member(household_id) and uploaded_by = auth.uid());
create policy cat_attachments_member_update on public.cat_attachments for update
  using (uploaded_by = auth.uid() or public.household_role(household_id) in ('owner','admin'))
  with check (uploaded_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));
create policy cat_attachments_member_delete on public.cat_attachments for delete
  using (uploaded_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));

create policy cat_health_records_member_select on public.cat_health_records for select
  using (public.is_household_member(household_id));
create policy cat_health_records_member_insert on public.cat_health_records for insert
  with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy cat_health_records_member_update on public.cat_health_records for update
  using (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'))
  with check (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));
create policy cat_health_records_member_delete on public.cat_health_records for delete
  using (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));

create policy cat_vaccinations_member_select on public.cat_vaccinations for select
  using (public.is_household_member(household_id));
create policy cat_vaccinations_member_insert on public.cat_vaccinations for insert
  with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy cat_vaccinations_member_update on public.cat_vaccinations for update
  using (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'))
  with check (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));
create policy cat_vaccinations_member_delete on public.cat_vaccinations for delete
  using (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));

create policy food_products_member_select on public.food_products for select
  using (public.is_household_member(household_id));
create policy food_products_member_insert on public.food_products for insert
  with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy food_products_member_update on public.food_products for update
  using (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'))
  with check (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));
create policy food_products_member_delete on public.food_products for delete
  using (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));

create policy cat_food_profiles_member_select on public.cat_food_profiles for select
  using (public.is_household_member(household_id));
create policy cat_food_profiles_member_insert on public.cat_food_profiles for insert
  with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy cat_food_profiles_member_update on public.cat_food_profiles for update
  using (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'))
  with check (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));
create policy cat_food_profiles_member_delete on public.cat_food_profiles for delete
  using (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));

create policy cat_expenses_member_select on public.cat_expenses for select
  using (public.is_household_member(household_id));
create policy cat_expenses_member_insert on public.cat_expenses for insert
  with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy cat_expenses_member_update on public.cat_expenses for update
  using (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'))
  with check (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));
create policy cat_expenses_member_delete on public.cat_expenses for delete
  using (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));

create policy cat_scan_records_member_select on public.cat_scan_records for select
  using (public.is_household_member(household_id));
create policy cat_scan_records_member_insert on public.cat_scan_records for insert
  with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy cat_scan_records_member_update on public.cat_scan_records for update
  using (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'))
  with check (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));
create policy cat_scan_records_member_delete on public.cat_scan_records for delete
  using (created_by = auth.uid() or public.household_role(household_id) in ('owner','admin'));

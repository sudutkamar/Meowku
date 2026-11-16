-- FK indexes (audit)
create index if not exists notifications_occurrence_id_idx on public.notifications (occurrence_id);
create index if not exists notifications_household_id_idx on public.notifications (household_id);
create index if not exists cat_attachments_cat_id_idx on public.cat_attachments (cat_id);
create index if not exists cat_scan_records_cat_id_idx on public.cat_scan_records (cat_id);
create index if not exists cat_expenses_attachment_id_idx on public.cat_expenses (attachment_id);
create index if not exists cat_health_records_attachment_id_idx on public.cat_health_records (attachment_id);
create index if not exists cat_vaccinations_attachment_id_idx on public.cat_vaccinations (attachment_id);
create index if not exists cat_food_profiles_food_product_id_idx on public.cat_food_profiles (food_product_id);
create index if not exists schedule_occurrences_completed_by_idx on public.schedule_occurrences (completed_by);
create index if not exists schedules_litter_box_id_idx on public.schedules (litter_box_id);
create index if not exists household_assignees_linked_user_id_idx on public.household_assignees (linked_user_id);
create index if not exists household_schedule_rotation_days_user_id_idx on public.household_schedule_rotation_days (user_id);
create index if not exists household_schedule_rotation_days_assignee_id_idx on public.household_schedule_rotation_days (assignee_id);
create index if not exists schedule_occurrences_household_completed_archived_local_idx on public.schedule_occurrences (household_id, completed_at, archived_at, local_date);

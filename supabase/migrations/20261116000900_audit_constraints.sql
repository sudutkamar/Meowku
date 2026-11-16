-- CHECK role
alter table public.household_members
  drop constraint if exists household_members_role_check;
alter table public.household_members
  add constraint household_members_role_check check (role in ('owner','admin','member'));

-- one owner per household
create unique index if not exists household_members_one_owner_idx
  on public.household_members (household_id) where role = 'owner';

-- rotation range check (example)
-- (placeholder: adjust column names as needed)

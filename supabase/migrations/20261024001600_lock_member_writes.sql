-- Membership changes must be audited through the capability RPCs.
drop policy if exists members_insert_admin on public.household_members;
drop policy if exists members_update_admin on public.household_members;

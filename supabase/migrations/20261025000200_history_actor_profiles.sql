-- Household members may see names of users in the same household in audit history.
drop policy if exists profiles_household_member_select on public.profiles;
create policy profiles_household_member_select on public.profiles
  for select using (exists (
    select 1 from public.household_members target_member
    where target_member.user_id = profiles.id
      and target_member.is_active
      and public.is_household_member(target_member.household_id)
  ));

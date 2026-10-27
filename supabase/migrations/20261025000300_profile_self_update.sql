drop policy if exists profiles_self_update on public.profiles;

create policy profiles_self_update on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

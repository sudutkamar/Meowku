create table if not exists public.household_streaks (
  household_id uuid not null references public.households(id) on delete cascade,
  subject_type text not null check (subject_type in ('member','cat')),
  subject_id uuid not null,
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_completion date,
  reliability_score numeric(5,2),
  computed_at timestamptz not null default now(),
  primary key (household_id, subject_type, subject_id)
);

alter table public.household_streaks enable row level security;

create policy "household_streaks member read" on public.household_streaks
  for select to authenticated
  using (exists (select 1 from public.household_members hm where hm.household_id = household_streaks.household_id and hm.user_id = auth.uid()));

create or replace function public.recompute_household_streaks(p_household_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.household_streaks (household_id, subject_type, subject_id, current_streak, best_streak, last_completion, reliability_score, computed_at)
  select p_household_id, 'member', hm.user_id, 0, 0, null, 0, now()
  from public.household_members hm where hm.household_id = p_household_id
  on conflict (household_id, subject_type, subject_id) do update set computed_at = now();
end; $$;
grant execute on function public.recompute_household_streaks(uuid) to authenticated;

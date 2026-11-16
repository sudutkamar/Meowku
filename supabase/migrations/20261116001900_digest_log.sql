create table if not exists public.household_digest_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  sent_at timestamptz not null default now(),
  status text not null default 'sent',
  payload jsonb
);
alter table public.household_digest_log enable row level security;
create policy "household_digest_log member read" on public.household_digest_log
  for select to authenticated
  using (exists (select 1 from public.household_members hm where hm.household_id = household_digest_log.household_id and hm.user_id = auth.uid()));

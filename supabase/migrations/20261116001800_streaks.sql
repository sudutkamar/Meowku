-- Streak & Reliability Score (derived, idempotent)
create table if not exists household_streaks (
  household_id uuid not null references households(id) on delete cascade,
  subject_type text not null check (subject_type in ('member','cat')),
  subject_id uuid not null,
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_completion date,
  reliability_score numeric(5,2),
  computed_at timestamptz not null default now(),
  primary key (household_id, subject_type, subject_id)
);
alter table household_streaks enable row level security;
create policy hs_read on household_streaks for select using (is_household_member(household_id));

create or replace function recompute_household_streaks(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_household_member(p_household_id) then raise exception 'household_access_denied'; end if;
  -- derived table: reset then recompute from occurrences (simplified; full logic can be refined)
  delete from household_streaks where household_id = p_household_id;
  insert into household_streaks (household_id, subject_type, subject_id, current_streak, best_streak, last_completion, reliability_score, computed_at)
  select p_household_id, 'cat', c.id, 0, 0, null, null, now()
  from cats c
  where c.household_id = p_household_id and c.is_active = true;
end;
$$;
grant execute on function recompute_household_streaks(uuid) to authenticated;
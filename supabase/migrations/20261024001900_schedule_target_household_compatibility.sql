-- The legacy target check predates the household fallback target used by schedule generation.
alter table public.schedule_targets drop constraint if exists schedule_targets_check;

create index if not exists schedule_occurrences_due_dispatch_idx
  on public.schedule_occurrences (scheduled_at, household_id)
  where completed_at is null and archived_at is null;

create index if not exists push_subscriptions_active_user_idx
  on public.push_subscriptions (user_id, household_id)
  where revoked_at is null;

create index if not exists notifications_recipient_created_idx
  on public.notifications (user_id, created_at desc)
  where hidden_at is null;

-- Notification Engine v2
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in ('due_reminder','overdue_escalation','digest','nudge','system','stock_low','vaccination_due'));
alter table notifications add column if not exists dedupe_key text;
create unique index if not exists notifications_dedupe_key_idx on notifications(dedupe_key) where dedupe_key is not null;

alter table notification_preferences add column if not exists digest_enabled boolean not null default true;
alter table notification_preferences add column if not exists escalation_enabled boolean not null default true;

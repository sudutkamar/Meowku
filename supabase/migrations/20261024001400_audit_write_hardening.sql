-- Audit rows are written only by trusted database functions; clients may read but not forge history.
drop policy if exists audit_events_member_insert on public.audit_events;

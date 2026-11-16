-- Audit history must survive household deletion attempts: switching the FK
-- from cascade to restrict makes audit rows immutable evidence. Deleting a
-- household with audit history is now rejected by the database.

alter table public.audit_events
  drop constraint audit_events_household_id_fkey;
alter table public.audit_events
  add constraint audit_events_household_id_fkey
  foreign key (household_id) references public.households(id)
  on delete restrict;

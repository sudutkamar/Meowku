-- Keep push notification clicks inside the authenticated app shell.
-- Legacy /jadwal values are normalized in the service worker as well.
alter table public.notifications
  alter column action_url set default '/app/riwayat-jadwal';

update public.notifications
set action_url = '/app/riwayat-jadwal'
where action_url = '/jadwal';

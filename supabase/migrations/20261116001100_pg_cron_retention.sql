do $$
begin
  create extension if not exists pg_cron;
exception when others then
  null;
end $$;

do $$
begin
  perform cron.schedule('meowku-retention', '0 3 * * *', $cron$
    delete from public.notifications where hidden_at is not null and read_at is not null and created_at < now() - interval '90 days';
    delete from public.push_subscriptions where revoked_at is not null and revoked_at < now() - interval '30 days';
  $cron$);
exception when others then
  null;
end $$;

-- 0015_purge_old_rate_limit_rows
-- rpc_rate_limits rows are reused in place while their fixed window is still fresh, but nothing
-- ever deletes a row once its bucket goes cold - already flagged as a known follow-up in the
-- table's own comment (schema.sql). A fixed-window counter table like this only ever needs the
-- current window's rows; anything older than a day is guaranteed stale. Runs once daily via
-- pg_cron, the same mechanism already used for the reminders schedule (migration 0010).

do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-stale-rate-limit-rows') then
    perform cron.unschedule('purge-stale-rate-limit-rows');
  end if;
end;
$$;

select cron.schedule(
  'purge-stale-rate-limit-rows',
  '30 3 * * *', -- once daily, off the top of the hour to avoid contending with the reminders cron
  $cron$
  delete from public.rpc_rate_limits where window_start < now() - interval '2 days';
  $cron$
);

insert into public.nr_schema_meta (id, version)
values (1, 15)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();

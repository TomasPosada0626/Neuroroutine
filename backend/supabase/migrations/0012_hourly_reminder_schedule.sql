-- 0012_hourly_reminder_schedule
-- send-due-reminders read reminder_preferences.reminder_hour and .timezone from the very first
-- version of this table (0005), but never actually used either one to decide WHEN to email a
-- user - the function only checked email_enabled, and the daily cron (0010) fired once at a
-- fixed 12:00 UTC for everyone. The settings screen tells users "te avisamos a las HH:00" and
-- that was false: every eligible user got emailed at the same UTC instant regardless of what
-- hour they configured.
--
-- The function itself now filters by isReminderHourNow(reminder_hour, timezone, now) (see
-- backend/supabase/functions/send-due-reminders/index.ts) - each user matches during exactly
-- one hour of the day, so this migration only needs to make the trigger fire once per hour
-- instead of once per day for that per-user filter to actually do anything.

do $$
begin
  perform cron.unschedule('send-due-reminders-daily');
exception
  when others then
    null; -- already renamed/removed by a prior run of this migration
end;
$$;

do $$
begin
  perform cron.unschedule('send-due-reminders-hourly');
exception
  when others then
    null; -- no existing job with this name yet; nothing to remove
end;
$$;

select cron.schedule(
  'send-due-reminders-hourly',
  '0 * * * *', -- every hour on the hour; each user is only matched during their own configured hour
  $cron$
  select net.http_post(
    url := 'https://mqunhthsbbwsrkmxanux.supabase.co/functions/v1/send-due-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'send_due_reminders_service_key'
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);

insert into public.nr_schema_meta (id, version)
values (1, 12)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();

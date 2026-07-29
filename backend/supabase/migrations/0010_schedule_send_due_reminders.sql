-- 0010_schedule_send_due_reminders
-- send-due-reminders is deployed and can send real email via Resend (ADR-012), but nothing
-- ever calls it automatically: the project README still says "Create a daily schedule in
-- Supabase Dashboard -> Edge Functions -> Schedules" as a manual step nobody has done. Without
-- that, the pipeline only runs when someone remembers to invoke it by hand.
--
-- This uses pg_cron + pg_net (both official Supabase extensions) to call the function's HTTP
-- endpoint once a day directly from Postgres, so the schedule lives in version control instead
-- of a Dashboard click that leaves no trace in this repo. The service role key itself is never
-- put in this file (or any file) — it's read at call time from Supabase Vault, where it must be
-- stored once, manually, by whoever runs this migration (see the REQUIRED MANUAL STEP below).
--
-- Why Vault instead of a hardcoded key: this file is committed to git. A service role key
-- embedded here would be a permanent, unrevoked credential leak the moment this repo is public
-- or shared — Vault keeps the secret in the database's encrypted secret store, never in a file
-- anyone can `git log` their way back to.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- REQUIRED MANUAL STEP (run once, replace the placeholder, never commit the real value):
--   select vault.create_secret('paste-your-actual-service-role-key-here', 'send_due_reminders_service_key');
-- Do this in the Supabase SQL Editor directly, in a statement you don't save/commit anywhere.
-- If a secret with that name already exists, use vault.update_secret(id, new_secret) instead
-- (create_secret errors on a duplicate name).

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'send_due_reminders_service_key'
  ) then
    raise notice
      'Vault secret "send_due_reminders_service_key" is not set yet. The cron job below will '
      'be created, but every run will fail (401) until you run: '
      'select vault.create_secret(''<your service_role key>'', ''send_due_reminders_service_key'');';
  end if;
end;
$$;

-- Idempotent: unschedule any prior run of this same migration before recreating the job,
-- instead of accumulating duplicate cron entries every time this file is re-applied.
do $$
begin
  perform cron.unschedule('send-due-reminders-daily');
exception
  when others then
    null; -- no existing job with this name yet; nothing to remove
end;
$$;

select cron.schedule(
  'send-due-reminders-daily',
  '0 12 * * *', -- 12:00 UTC daily; adjust to your users' timezone distribution if needed
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
values (1, 10)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();

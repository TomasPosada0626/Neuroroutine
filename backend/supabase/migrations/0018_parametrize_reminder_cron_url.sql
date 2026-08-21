-- 0018_parametrize_reminder_cron_url
-- Migrations 0010 and 0012 hardcoded this project's production Supabase URL directly into the
-- cron.schedule() call. That's harmless for THIS project (a Supabase project ref isn't a secret),
-- but re-applying those migrations verbatim against a NEW project (e.g. spinning up a
-- staging/dev Supabase project from this same migrations folder) would silently schedule its
-- cron job to call THIS project's production edge function instead of its own - piling a second
-- project's traffic onto this project's Resend quota and reminders data, not just creating a dead
-- job (audit: Portabilidad, Medio).
--
-- This migration re-schedules the job to build the URL from a Vault secret instead of a literal,
-- following the exact same "fails loud if unconfigured" pattern migration 0010 already uses for
-- the service-role key: a fresh/unconfigured project gets a cron job that predictably fails every
-- run (net.http_post with a null url) until someone runs the vault command below, instead of one
-- that quietly succeeds against someone else's production database.
--
-- REQUIRED MANUAL STEP for THIS project (run once, in the Supabase SQL Editor, never commit the
-- real value anywhere): the literal URL below is this project's own public project URL, not a
-- secret, but it still has to be copied into Vault for the cron job to keep working after this
-- migration is applied:
--   select vault.create_secret('https://mqunhthsbbwsrkmxanux.supabase.co', 'send_due_reminders_project_url');
-- Skipping this step does not affect anything until this migration is actually applied to a
-- project (migrations in this repo are never auto-applied by CI - see backend-rls in
-- .github/workflows/ci.yml, which only ever runs against a throwaway local stack). Once applied,
-- hourly reminders stop sending until the secret above exists.

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'send_due_reminders_project_url'
  ) then
    raise notice
      'Vault secret "send_due_reminders_project_url" is not set yet. Run: '
      'select vault.create_secret(''https://<your-project-ref>.supabase.co'', ''send_due_reminders_project_url''); '
      'The cron job below will be created, but every run will fail until this is set.';
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-due-reminders-hourly') then
    perform cron.unschedule('send-due-reminders-hourly');
  end if;
end;
$$;

select cron.schedule(
  'send-due-reminders-hourly',
  '0 * * * *', -- every hour on the hour; each user is only matched during their own configured hour
  $cron$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'send_due_reminders_project_url'
    ) || '/functions/v1/send-due-reminders',
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
values (1, 18)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();

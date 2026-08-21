-- 0019_action_latency_budget
-- docs/architecture/performance-budget.md targets p95 routine-create <=800ms and p95
-- task-complete <=600ms, but says outright these are "still a weekly manual review from CI
-- artifacts and app events; no automated gate yet" (audit: Rendimiento, Medio). The raw data
-- already exists - routinesStore.ts has logged `duration_ms` on the `routine_created` and
-- `task_completed` app_events for a while - what was missing was anything that turns "someone
-- queries app_events by hand" into an actual automated check.
--
-- This adds a read-only aggregate RPC (no PII, no per-user rows - same sensitivity class as the
-- already-public get_nr_schema_status()) that a scheduled GitHub Actions job can call with just
-- the public anon key, no new secrets needed - see .github/workflows/action-latency-check.yml.

-- Supports the new function's WHERE clause: filtering app_events by event_name + created_at had
-- no index before this (the existing app_events_user_created_idx is keyed by user_id first).
create index if not exists app_events_name_created_idx
  on public.app_events (event_name, created_at desc);

create or replace function public.get_action_latency_p95(p_days integer default 7)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'p95_routine_created_ms', (
      select percentile_cont(0.95) within group (order by (meta->>'duration_ms')::numeric)
      from public.app_events
      where event_name = 'routine_created'
        and created_at > now() - (greatest(p_days, 1) || ' days')::interval
        and meta ? 'duration_ms'
    ),
    'p95_task_completed_ms', (
      select percentile_cont(0.95) within group (order by (meta->>'duration_ms')::numeric)
      from public.app_events
      where event_name = 'task_completed'
        and created_at > now() - (greatest(p_days, 1) || ' days')::interval
        and meta ? 'duration_ms'
    ),
    'sample_window_days', greatest(p_days, 1)
  );
$$;

grant execute on function public.get_action_latency_p95(integer) to anon, authenticated;

insert into public.nr_schema_meta (id, version)
values (1, 19)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();

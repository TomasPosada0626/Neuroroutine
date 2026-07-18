-- Observability queries for NeuroRoutine
-- Scope: app_events based metrics for dashboards/alerts

-- 1) p95 duration by flow in last 24h
SELECT
  event_name,
  COUNT(*) AS samples,
  ROUND((percentile_cont(0.95) WITHIN GROUP (ORDER BY (meta->>'duration_ms')::numeric))::numeric, 2) AS p95_duration_ms
FROM public.app_events
WHERE created_at >= now() - interval '24 hours'
  AND meta ? 'duration_ms'
GROUP BY event_name
ORDER BY p95_duration_ms DESC NULLS LAST;

-- 2) p95 login duration in last 24h
SELECT
  ROUND((percentile_cont(0.95) WITHIN GROUP (ORDER BY (meta->>'duration_ms')::numeric))::numeric, 2) AS p95_login_ms
FROM public.app_events
WHERE created_at >= now() - interval '24 hours'
  AND event_name = 'auth_login_success'
  AND meta ? 'duration_ms';

-- 3) Event volume for key flows in last 24h
SELECT
  event_name,
  COUNT(*) AS total
FROM public.app_events
WHERE created_at >= now() - interval '24 hours'
  AND event_name IN (
    'auth_login_success',
    'routine_created',
    'task_created',
    'task_completed',
    'offline_sync_completed'
  )
GROUP BY event_name
ORDER BY total DESC;

-- 4) Offline sync quality (24h)
SELECT
  COUNT(*) AS sync_events,
  COALESCE(SUM((meta->>'synced_count')::int), 0) AS synced_tasks,
  ROUND(AVG((meta->>'duration_ms')::numeric), 2) AS avg_sync_duration_ms
FROM public.app_events
WHERE created_at >= now() - interval '24 hours'
  AND event_name = 'offline_sync_completed'
  AND meta ? 'duration_ms';

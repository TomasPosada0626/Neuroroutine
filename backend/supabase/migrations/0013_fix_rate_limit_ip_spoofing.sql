-- 0013_fix_rate_limit_ip_spoofing
-- get_email_by_username (0007) rate-limited callers by taking the LEFT-most entry of
-- x-forwarded-for as the client identifier. Each hop in a proxy chain APPENDS its observed peer
-- to the right of that header rather than overwriting it, so the left-most entry is whatever the
-- caller itself sent - fully attacker-controlled. A script could send a different fake
-- x-forwarded-for on every call and get a fresh rate-limit bucket each time, defeating the limit
-- entirely. This switches to the RIGHT-most entry, which is the one Supabase's own edge appended
-- from the connection it actually observed and the caller cannot forge.

create or replace function public.get_email_by_username(u text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  client_key text;
  bucket text;
  window_len constant interval := interval '1 minute';
  max_calls constant integer := 8;
  current_count integer;
  xff_parts text[];
begin
  -- PostgREST (Supabase's API layer) exposes request headers as a JSON GUC. x-forwarded-for can
  -- be a comma-separated chain (client, proxy1, proxy2, ...); each hop APPENDS its observed peer
  -- to the right rather than overwriting the header, so the left-most entry is whatever the
  -- original caller sent and is fully attacker-controlled (a client can send its own fake
  -- x-forwarded-for and get a fresh rate-limit bucket on every call). The right-most entry is the
  -- one Supabase's own edge appended from the connection it actually observed, so that's the
  -- only value here that isn't spoofable by the caller. If headers aren't available at all (e.g.
  -- a direct Postgres connection bypassing PostgREST), every caller falls into one shared
  -- "unknown" bucket, which is strictly more restrictive than no limit at all, not a bypass.
  xff_parts := regexp_split_to_array(
    coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
    '\s*,\s*'
  );
  client_key := coalesce(
    nullif(btrim(xff_parts[array_upper(xff_parts, 1)]), ''),
    'unknown'
  );
  bucket := 'get_email_by_username:' || client_key;

  insert into public.rpc_rate_limits as t (bucket_key, window_start, hit_count)
  values (bucket, now(), 1)
  on conflict (bucket_key) do update
    set hit_count = case
          when t.window_start < now() - window_len then 1
          else t.hit_count + 1
        end,
        window_start = case
          when t.window_start < now() - window_len then now()
          else t.window_start
        end
  returning hit_count into current_count;

  if current_count > max_calls then
    raise exception 'Too many requests, try again in a minute.' using errcode = '55000';
  end if;

  return (
    select p.email
    from public.profiles p
    where lower(p.username) = lower(u)
    limit 1
  );
end;
$$;

grant execute on function public.get_email_by_username(text) to anon, authenticated;

insert into public.nr_schema_meta (id, version)
values (1, 13)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();

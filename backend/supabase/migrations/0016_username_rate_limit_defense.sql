-- 0016_username_rate_limit_defense
-- get_email_by_username (0007, hardened in 0013) rate-limits by the caller's IP. That stops a
-- single script hammering the endpoint, but an attacker distributing requests across many real
-- IPs isn't slowed by a limit indexed only by IP at all (auto-flagged in
-- docs/security/hardening.md item 6). The actual attack this endpoint needs to resist is username
-- enumeration/probing, so this adds a second bucket keyed by the *username being queried*,
-- independent of which IP asked: probing the same username from 1000 different IPs now still hits
-- one shared counter. The existing IP bucket stays as-is (defense in depth: it still catches an
-- attacker scanning many different usernames from one IP).
--
-- The rate-limit-and-increment logic used to live inline in get_email_by_username; it's pulled
-- into a small security-definer helper here so this migration doesn't have to duplicate the
-- fixed-window bucket arithmetic a second time for the new key.

create or replace function public._rate_limit_check(
  p_bucket text,
  p_window interval,
  p_max integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.rpc_rate_limits as t (bucket_key, window_start, hit_count)
  values (p_bucket, now(), 1)
  on conflict (bucket_key) do update
    set hit_count = case
          when t.window_start < now() - p_window then 1
          else t.hit_count + 1
        end,
        window_start = case
          when t.window_start < now() - p_window then now()
          else t.window_start
        end
  returning hit_count into current_count;

  return current_count <= p_max;
end;
$$;

-- No grant to anon/authenticated: only meant to be called from other security-definer functions
-- in this schema, which run as this function's owner and so already have implicit execute rights
-- on it without a separate grant.

create or replace function public.get_email_by_username(u text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  client_key text;
  xff_parts text[];
  username_key text;
begin
  xff_parts := regexp_split_to_array(
    coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
    '\s*,\s*'
  );
  client_key := coalesce(nullif(btrim(xff_parts[array_upper(xff_parts, 1)]), ''), 'unknown');
  username_key := lower(btrim(coalesce(u, '')));

  if not public._rate_limit_check('get_email_by_username:ip:' || client_key, interval '1 minute', 8) then
    raise exception 'Too many requests, try again in a minute.' using errcode = '55000';
  end if;

  -- Higher threshold than the IP bucket above: this one exists to stop *sustained, distributed*
  -- probing of a single username, not to catch a real user who fat-fingers their username a
  -- couple of times in a row.
  if username_key <> '' and not public._rate_limit_check('get_email_by_username:user:' || username_key, interval '1 minute', 20) then
    raise exception 'Too many requests, try again in a minute.' using errcode = '55000';
  end if;

  return (
    select p.email
    from public.profiles p
    where lower(p.username) = username_key
    limit 1
  );
end;
$$;

grant execute on function public.get_email_by_username(text) to anon, authenticated;

insert into public.nr_schema_meta (id, version)
values (1, 16)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();

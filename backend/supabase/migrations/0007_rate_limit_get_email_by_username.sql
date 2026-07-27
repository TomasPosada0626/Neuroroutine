-- 0007_rate_limit_get_email_by_username
-- get_email_by_username is callable by anon (needed for username-based login) and, until now,
-- had no server-side throttling at all: authStore.ts's dummy sign-in attempt only equalizes
-- *timing* between "username exists" and "username doesn't exist" so a script watching response
-- latency can't tell them apart, but nothing stopped that same script from just calling the RPC
-- thousands of times a minute to enumerate valid usernames. This adds a real per-caller cap
-- enforced inside the function itself, so it applies no matter which client calls it.

create table if not exists public.rpc_rate_limits (
  bucket_key text primary key,
  window_start timestamptz not null default now(),
  hit_count integer not null default 0
);

alter table public.rpc_rate_limits enable row level security;
-- No policies: only security definer functions (which run as the owning role and bypass RLS)
-- touch this table. Neither anon nor authenticated get any direct grant on it below.

comment on table public.rpc_rate_limits is
  'Fixed-window call counters for rate-limited RPCs, keyed by "<rpc name>:<client identifier>". '
  'Rows are reused/reset in place once their window_start is stale on the next hit; nothing '
  'purges old rows automatically, so periodically deleting rows older than a day or two is a '
  'reasonable follow-up if this grows large.';

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
begin
  -- PostgREST (Supabase's API layer) exposes request headers as a JSON GUC. x-forwarded-for is
  -- set by Supabase's edge network for every API request; it can be a comma-separated chain
  -- (client, proxy1, proxy2, ...), so take the left-most (original client) entry. If headers
  -- aren't available at all (e.g. a direct Postgres connection bypassing PostgREST), every
  -- caller falls into one shared "unknown" bucket, which is strictly more restrictive than no
  -- limit at all, not a bypass.
  client_key := coalesce(
    nullif(
      btrim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)),
      ''
    ),
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
values (1, 7)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();

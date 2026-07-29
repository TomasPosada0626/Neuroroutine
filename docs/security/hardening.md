# Security Hardening Guide

This guide complements the existing RLS-first model with practical hardening actions.

## Current Security Baseline

- Auth via Supabase Auth.
- Data isolation through RLS and `auth.uid()` ownership checks.
- Frontend uses publishable anon key only.
- Service role key restricted to backend/server contexts.

## Threat Model (MVP Scope)

1. Cross-user data access attempt
   - Risk: high
   - Mitigation: strict RLS policies on all user-scoped tables

2. Secret exposure in frontend
   - Risk: high
   - Mitigation: never expose service role or backend-only secrets in client runtime

3. Injection via untrusted text input
   - Risk: medium
   - Mitigation: parameterized Supabase queries + schema validation + output escaping by React

4. Abuse of event logging for data leakage
   - Risk: medium
   - Mitigation: payload sanitization and blocked sensitive keys in event metadata

5. CI/CD misconfiguration leakage
   - Risk: medium
   - Mitigation: secret-only deploy credentials, workflow gate checks, protected branches

6. Username enumeration via `get_email_by_username`
   - Risk: low (was medium)
   - Mitigation: login always performs an equivalent-cost dummy Supabase Auth call when
     a username doesn't resolve, so a nonexistent username can't be distinguished from a
     wrong password by response time alone. The RPC also enforces a server-side per-caller
     rate limit (8 calls/minute, keyed by the `x-forwarded-for` client IP from PostgREST's
     request headers, falling back to one shared bucket if that header is ever unavailable)
     — see `backend/supabase/migrations/0007_rate_limit_get_email_by_username.sql`. Residual
     risk: an attacker spreading requests across many IPs isn't slowed by an IP-keyed limit;
     a per-username or global cap would close that gap if it's ever observed in practice.

7. Dependency CVE: react-router RSC-mode CSRF bypass (GHSA-qwww-vcr4-c8h2)
   - Risk: low for this deployment (flagged high by `npm audit` for the package generally)
   - `react-router-dom@7.18.1` (current, and also the latest published version) falls in the
     advisory's vulnerable range `>=7.12.0 <8.3.0`. The vulnerability is specifically a CSRF
     bypass in **RSC (React Server Components) mode** action handling — this app is a plain Vite
     SPA using `BrowserRouter` with no server-side route/action handlers and no RSC mode enabled
     anywhere in `frontend/src`, so the vulnerable code path is not reachable here.
   - `npm audit fix --force` only offers a **downgrade** to `7.11.0` (`isSemVerMajor: true`) —
     no forward-fixed version exists yet at time of writing. Downgrading five minor versions on a
     pinned dependency to close a non-exploitable path would trade a real (if small) regression
     risk for zero actual risk reduction, so it was deliberately not done.
   - Mitigation: Dependabot (already configured) will surface a patched release when one ships;
     re-evaluate this entry then. Documented here instead of silently ignored so the decision is
     auditable, not assumed.

## Hardening Checklist

### App and Client

- [x] Add CSP headers in production hosting config (`frontend/vercel.json`, `frontend/nginx.conf`).
- [x] Add `X-Frame-Options` / frame-ancestors strategy.
- [x] Add strict `Referrer-Policy` and `Permissions-Policy`.
- [x] Drop `'unsafe-inline'` from `script-src` (the built app has no inline `<script>`, only an
      external module bundle, so it was never actually needed). `style-src` keeps
      `'unsafe-inline'` because inline `style` attributes from React/`@dnd-kit` depend on it.
- [x] Raise new-account password minimum from 6 to 10 characters (`registerSchema`); login keeps
      accepting existing shorter passwords so current accounts aren't locked out.
- [x] Ensure all external dependencies are pinned and reviewed (`npm audit` run 2026-07-27; one
      open advisory reviewed and documented as not applicable — see threat model item 7).

### Auth and Session

- [ ] Verify Supabase redirect URLs are exact and minimal.
- [ ] Enable email confirmation and bot mitigation where applicable.
- [ ] Review session expiration and refresh behavior.

### Database and RLS

- [x] Confirm RLS is enabled on every user-scoped table (`profiles`, `routines`,
      `routine_tasks`, `routine_task_events`, `reminder_preferences`, `rpc_rate_limits`,
      `app_events` — verified 2026-07-28 by grepping `schema.sql`). `nr_schema_meta` (not
      user-scoped, just a version counter) was the one table without it; closed in
      `0011_lock_down_schema_meta_table.sql` for consistency, even though it holds no user data
      and its only client-facing access path (`get_nr_schema_status()`) is a `security definer`
      function unaffected by RLS either way.
- [x] Add regression tests for policy assumptions (A cannot read B data) — see
      `frontend/e2e/routines.spec.ts`'s "RLS regression (shared accounts)" suite: one test proves
      user B can't see user A's routine, another attempts a direct REST PATCH/DELETE against
      user A's row while authenticated as B and asserts zero rows are affected. Run against the
      real project, not mocked.
- [x] Restrict or audit privileged RPC functions — both `security definer` functions
      (`get_email_by_username`, rate-limited and timing-safe; `get_nr_schema_status`, read-only
      schema metadata with no user data) reviewed 2026-07-28.

### Secrets and CI/CD

- [ ] Enforce branch protection for `main`.
- [ ] Require passing CI before merge.
- [ ] Rotate deploy tokens periodically.
- [ ] Use environment-scoped secrets in GitHub where possible.
- [x] Enable automated dependency and code scanning (`.github/dependabot.yml`, `.github/workflows/codeql.yml`).

## Incident Readiness

- Keep a lightweight incident log in repository issues labeled `incident`.
- Record: detection time, impact, root cause, mitigation, and follow-up action.
- Define rollback path per deployment provider.

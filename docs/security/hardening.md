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
     rate limit (8 calls/minute, keyed by the client IP) — see
     `backend/supabase/migrations/0007_rate_limit_get_email_by_username.sql`. **2026-08-14:**
     the IP was originally read from the left-most entry of `x-forwarded-for`, which is
     attacker-supplied (each hop *appends* rather than overwrites), so a caller could send a
     different fake left-most value on every request and get a fresh bucket each time,
     defeating the limiter entirely. Fixed in
     `0013_fix_rate_limit_ip_spoofing.sql` to read the right-most entry instead — the one
     Supabase's own edge appended from the connection it actually observed, which the caller
     cannot forge. **2026-08-20:** the residual gap noted here (an attacker spreading requests
     across many *real* IPs wasn't slowed by an IP-keyed limit alone) is closed by
     `0016_username_rate_limit_defense.sql`: a second bucket keyed by the *username being
     queried*, independent of caller IP, so probing one username from many different IPs now
     still hits a shared counter (20 calls/minute — higher than the IP bucket's 8, so a real user
     mistyping their username a few times is never blocked by this).

7. Dependency CVE: react-router RSC-mode CSRF bypass (GHSA-qwww-vcr4-c8h2)
   - Risk: **resolved 2026-08-14.** `react-router-dom` bumped from `^7.13.0` to `^7.18.2`
     (`package.json`), the first published release outside the advisory's vulnerable range
     `7.12.0–7.18.1`. `npm audit --omit=dev` now reports 0 vulnerabilities. Full test suite
     (597 tests) and production build re-verified green after the bump. This was low actual
     risk even before the fix — the vulnerability is specifically a CSRF bypass in RSC (React
     Server Components) mode action handling, and this app is a plain Vite SPA using
     `BrowserRouter` with no server-side route/action handlers or RSC mode — but a
     zero-regression-risk one-line fix existing made "documented as not applicable" the wrong
     call once it shipped.

8. Unauthenticated invocation of `send-due-reminders` (critical, found and fixed 2026-08-14)
   - Risk: was critical, now closed.
   - Supabase's platform JWT verification (`verify_jwt`) accepts any validly-signed project
     JWT, which includes the public `anon` key embedded in every deployed page — it does not by
     itself restrict a function to its intended caller. `handleRequest()` in
     `backend/supabase/functions/send-due-reminders/index.ts` took no request argument at all
     and built a full `service_role` Supabase client unconditionally, so anyone holding the
     public anon key could call the deployed function endpoint directly and repeatedly,
     triggering real Resend emails to real users on demand with no rate limit — cost and spam
     abuse, not just a data leak.
   - Mitigation: the function now requires the `Authorization` header's bearer token to
     exactly match `SUPABASE_SERVICE_ROLE_KEY` (constant-time comparison — see
     `timingSafeEqual`), the same value the `pg_cron` trigger already sends from Vault
     (`0012_hourly_reminder_schedule.sql`). Any caller without that secret gets a 401 before any
     database or Resend call happens. Covered by new Deno unit tests for `timingSafeEqual`.

9. Missing self-service account/data deletion (Legal/GDPR-style exposure, found and fixed
   2026-08-20)
   - Risk: was medium (a real gap between what `PRIVACY.md` promised and what the product did,
     not an access-control bug), now closed.
   - `PRIVACY.md` SS5-6 promised account deletion as a user right, but no self-service path existed
     anywhere in `frontend/src/features/auth` — only a manual email request.
   - Mitigation: `delete_own_account()` (`0017_account_deletion.sql`), a `security definer` RPC
     scoped to `auth.uid()` that deletes the caller's `auth.users` row. Every user-data table
     already declared `on delete cascade` off `auth.users(id)`, so this one delete cascades
     through routines/tasks/history/preferences/events and also signs the user out everywhere
     (Supabase's own auth schema cascades the same way). Exposed in the app as
     **Personalizar dashboard -> Zona de peligro -> Eliminar mi cuenta**
     (`DeleteAccountSection.tsx`), gated behind typing a confirmation word, not just a second
     click, given it's an irreversible cascading delete.

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
- [x] Ensure all external dependencies are pinned and reviewed (`npm audit --omit=dev` clean as
      of 2026-08-14 — see threat model item 7).
- [x] Add `Strict-Transport-Security` header (`frontend/nginx.conf`, `frontend/vercel.json`) —
      neither deploy target's repo config set this explicitly before 2026-08-14; whether the
      platform added it at its own edge was unverifiable from the repo alone.

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

- [x] Enforce branch protection for `main` — applied live 2026-08-20 (see
      `docs/github/manual-actions-checklist.md`): required status checks, no force-push, no
      branch deletion. `enforce_admins` deliberately stays off (solo-maintainer repo, no second
      approver to route a PR through), so this hardens PR-based/non-admin merges without locking
      the owner out of direct pushes.
- [x] Require passing CI before merge — same change: `Backend (Deno unit tests)`,
      `Backend RLS (pgTAP, local Postgres)`, `Frontend (lint + test + build)`, CodeQL, and
      gitleaks are required status checks. The two authenticated E2E jobs are intentionally not
      required yet (see `docs/github/manual-actions-checklist.md` for why and what unblocks it).
- [x] Gate production deploys on CI success, not just the same push — `deploy-vercel.yml` /
      `deploy-render.yml` now trigger on `workflow_run` after `CI` completes successfully,
      instead of firing independently off the same `push` event.
- [ ] Rotate deploy tokens periodically.
- [ ] Use environment-scoped secrets in GitHub where possible.
- [x] Enable automated dependency and code scanning (`.github/dependabot.yml`, `.github/workflows/codeql.yml`).

## Incident Readiness

- Keep a lightweight incident log in repository issues labeled `incident`.
- Record: detection time, impact, root cause, mitigation, and follow-up action.
- Define rollback path per deployment provider.

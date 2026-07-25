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
   - Risk: medium
   - Mitigation: login always performs an equivalent-cost dummy Supabase Auth call when
     a username doesn't resolve, so a nonexistent username can't be distinguished from a
     wrong password by response time alone. The RPC itself still has no server-side rate
     limit; a bulk-guessing attacker unbounded by request volume is a residual risk (see
     `docs/security/controls-gap-analysis.md`).

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
- [ ] Ensure all external dependencies are pinned and reviewed.

### Auth and Session

- [ ] Verify Supabase redirect URLs are exact and minimal.
- [ ] Enable email confirmation and bot mitigation where applicable.
- [ ] Review session expiration and refresh behavior.

### Database and RLS

- [ ] Confirm RLS is enabled on every user-scoped table.
- [ ] Add regression tests for policy assumptions (A cannot read B data).
- [ ] Restrict or audit privileged RPC functions.

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

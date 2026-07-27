# Security Controls Gap Analysis

## Implemented now

- CSP and baseline security headers
- Dependency automation and code scanning
- Security policy and hardening checklist

## Pending controls and status

1. Helmet
   - Status: not applicable in current frontend-static architecture.
   - Alternative: enforce equivalent headers at edge/server (Vercel + Nginx config already added).

2. Rate limiting
   - Status: implemented for `get_email_by_username` (8 calls/min per client IP, enforced inside
     the RPC via a `rpc_rate_limits` table — migration `0007_rate_limit_get_email_by_username`),
     on top of the existing timing-side-channel mitigation (see `hardening.md`). Not yet extended
     to other endpoints.
   - Alternative: add the same pattern (or an edge/gateway-level limiter) when write APIs expand.

3. Refresh token rotation
   - Status: handled by Supabase session model.
   - Action: periodically review Supabase auth/session settings.

4. Secret scanning
   - Status: implement workflow-level scan (see `.github/workflows/secret-scan.yml`).

5. Complete RLS regression
   - Status: partial E2E isolation exists.
   - Action: add mutate-deny regression scenario with two users in CI-ready pipeline.

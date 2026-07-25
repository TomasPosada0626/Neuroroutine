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
   - Status: not implemented at the request-volume level. A timing side-channel in the
     username-login lookup (`get_email_by_username`) is mitigated (see `hardening.md`), but
     nothing yet caps how many guesses per minute an attacker can send.
   - Alternative: add rate limits on API gateway/edge function endpoints when write APIs expand.

3. Refresh token rotation
   - Status: handled by Supabase session model.
   - Action: periodically review Supabase auth/session settings.

4. Secret scanning
   - Status: implement workflow-level scan (see `.github/workflows/secret-scan.yml`).

5. Complete RLS regression
   - Status: partial E2E isolation exists.
   - Action: add mutate-deny regression scenario with two users in CI-ready pipeline.

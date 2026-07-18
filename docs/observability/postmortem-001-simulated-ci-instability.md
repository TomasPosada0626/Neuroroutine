# Postmortem 001 - Simulated CI instability

## Incident summary

- Date/time: 2026-07-18
- Severity: low
- Duration: 35 minutes
- Detection: failed CI check on pull request

## Impact

- Users affected: none (pre-merge)
- Features affected: none in production
- Impact: delayed merge and release confidence

## Timeline

- T0: CI failed in PR due to test mocking regression
- T1: Reproduced failure locally and isolated broken mock chain
- T2: Fixed test typing and chain behavior, reran lint/build/tests

## Root cause

Test mocks for chained query behavior diverged from implementation expectations.

## What went well

- Fast local reproduction
- Existing CI gates prevented bad merge

## What did not go well

- Mock helpers were not strict enough initially

## Corrective actions

1. Keep typed mock chain helpers.
2. Add regression tests for chain fallbacks.
3. Preserve lint/build/test checks before pushes.

## Verification

All checks passed locally and CI returned green after fix.

# Case Study - NeuroRoutine

## Problem

Users can define habits but often fail to sustain execution due to friction, weak visibility, and inconsistent reliability across devices/networks.

## Decision

- Use RLS-first architecture with Supabase for secure multi-user boundaries.
- Implement offline queue for task creation continuity.
- Introduce quality and security gates (CI, CodeQL, Dependabot, audit hygiene).
- Add observability event durations for critical workflows.

## Result (measurable)

- Coverage reached high baseline with strong branch depth.
- CI quality gates enforced on every push/PR.
- npm audit reduced to zero known vulnerabilities after controlled remediation.
- Production headers and CSP baseline now documented and configured.

## What I learned

- Reliability and security controls are strongest when encoded as default workflows.
- High test coverage is useful only when critical branches and user flows are covered.

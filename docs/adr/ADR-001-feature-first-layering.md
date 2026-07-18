# ADR-001: Feature-first frontend layering

- Status: Accepted
- Date: 2026-07-18

## Context

The frontend needed to scale beyond a single-page demo while keeping business logic easy to locate, test, and refactor.

## Decision

Organize frontend code by business feature and enforce layering:

- `app`: top-level orchestration and routing
- `pages`: route composition only
- `features`: domain state, service calls, and feature components
- `shared`: reusable cross-feature modules

Dependency constraints are documented in [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Consequences

Positive:

- Better modularity and ownership boundaries.
- Easier test targeting by domain.
- Less accidental coupling between unrelated areas.

Trade-offs:

- More upfront structure discipline.
- Requires maintenance of barrel exports and clear contracts.

## Alternatives considered

- Type-first folders (`components`, `hooks`, `services` globally): rejected due to high cross-domain coupling risk.
- Fully page-centric organization: rejected because domain behavior becomes scattered.

## References

- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [frontend/src/features](../../frontend/src/features)
- [frontend/src/shared](../../frontend/src/shared)

# ADR-004: Dual deployment strategy (Vercel primary, Render fallback)

- Status: Accepted
- Date: 2026-07-18

## Context

The project needs resilient delivery for demos and evaluation, with minimized downtime risk if one provider has operational issues.

## Decision

Use Vercel as primary deployment target and Render as fallback path.

- CI keeps build quality gates independent from deploy provider.
- Dedicated deploy workflows exist for each provider.

## Consequences

Positive:

- Better operational resilience.
- Easier recovery and continuity during incidents.
- Demonstrates practical deployment maturity in portfolio context.

Trade-offs:

- More configuration and secrets to maintain.
- Need to keep runtime settings aligned across providers.

## Alternatives considered

- Single provider only: rejected due to single point of failure.

## References

- [\.github/workflows/deploy-vercel.yml](../../.github/workflows/deploy-vercel.yml)
- [\.github/workflows/deploy-render.yml](../../.github/workflows/deploy-render.yml)
- [docs/deployment/README.md](../deployment/README.md)

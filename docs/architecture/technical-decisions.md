# Technical Decisions

## Decision Set

1. Supabase Auth + Postgres + RLS
   - Rationale: secure multi-user boundaries with minimal backend overhead.

2. React + TypeScript + Vite
   - Rationale: fast iteration with typed frontend reliability.

3. Zustand for local domain state
   - Rationale: low boilerplate with testable action patterns.

4. React Query for server state
   - Rationale: cache lifecycle and stale-data controls.

5. Event-oriented progress model
   - Rationale: auditable streak/consistency analytics.

6. Dual deployment providers
   - Rationale: resilience and demo continuity.

7. Migration-driven schema evolution
   - Rationale: reproducible database changes.

## Trade-off log

- Faster MVP delivery increased some coupling in store layers.
- Security and data correctness were prioritized over broad feature count.
- Offline-first strategy chosen incrementally (queue first, service worker later).

## Revisit triggers

- Significant performance regressions.
- Growth in feature count that stresses current module boundaries.
- Security incidents or RLS policy complexity increase.

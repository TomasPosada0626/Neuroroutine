# ADR-003: Zustand for domain state + React Query for server state

- Status: Accepted
- Date: 2026-07-18

## Context

The frontend needs local domain interactions (selection, optimistic UI, offline queue state) and remote data lifecycle handling (cache, stale data control, refetching).

## Decision

Adopt a split state strategy:

- Zustand for domain/UI state and action orchestration.
- React Query for server data fetching cache and invalidation.

## Consequences

Positive:

- Clear separation between local intent and remote synchronization concerns.
- Lightweight state code with strong testability.
- Good performance defaults without Redux-scale ceremony.

Trade-offs:

- Two mental models to maintain.
- Requires team discipline on what belongs where.

## Alternatives considered

- Zustand only for everything: rejected due to duplicated query/cache concerns.
- React Query only for everything: rejected because local UI workflow state gets awkward.

## References

- [frontend/src/features/routines/routinesStore.ts](../../frontend/src/features/routines/routinesStore.ts)
- [frontend/src/shared/api/queryClient.ts](../../frontend/src/shared/api/queryClient.ts)

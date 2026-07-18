# ADR-006: Offline queue with eventual consistency for task creation

- Status: Accepted
- Date: 2026-07-18

## Context

Users can lose connectivity during routine usage. Blocking task creation in these moments harms reliability perception.

## Decision

Persist offline task inserts in IndexedDB and synchronize when connectivity returns.

- Queue store: `task_inserts`.
- Local placeholder IDs are replaced after successful server creation.
- Sync completion emits operational event metadata.

## Consequences

Positive:

- Reduces perceived data loss.
- Preserves user momentum in unstable networks.

Trade-offs:

- Requires reconciliation logic.
- Offline conflict messaging must stay clear in UX.

## Alternatives considered

- Disable writes offline: rejected for poor resilience.
- Full CRDT architecture: postponed; unnecessary for current scope.

## References

- [frontend/src/shared/offline/taskSyncQueue.ts](../../frontend/src/shared/offline/taskSyncQueue.ts)
- [frontend/src/features/routines/routinesStore.ts](../../frontend/src/features/routines/routinesStore.ts)

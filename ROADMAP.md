# Roadmap

## Near-term (Now -> 6 weeks)

1. Add the 6 GitHub secrets needed to turn on the RLS cross-user E2E job (see
   `docs/github/manual-actions-checklist.md`) — the test itself already exists.
2. Add server-side rate limiting for `get_email_by_username` (client-side timing mitigation
   is in place; request-volume limiting still isn't).
3. Integrate SearchBar UI with existing RPC search backend.
4. Improve offline-to-online conflict messaging and retry UX.

## Mid-term (6 -> 12 weeks)

1. Add service-worker app-shell strategy.
2. Expand observability with critical flow durations and dashboards.
3. Implement task reordering UX with persistence.

## Longer-term

1. Real-time updates where beneficial.
2. Exportable analytics reports.
3. Advanced personalization and profile capabilities.

## Delivery principle

Prioritize user-value + reliability + security over feature volume.

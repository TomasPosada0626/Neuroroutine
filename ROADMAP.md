# Roadmap

## Near-term (Now -> 6 weeks)

1. Add server-side rate limiting for `get_email_by_username` (client-side timing mitigation
   is in place; request-volume limiting still isn't).
2. Improve offline-to-online conflict messaging and retry UX.
3. Keep chipping away at branch coverage in `routinesStore.ts`/`routinesService.ts` and add
   direct tests for `RoutinePanel.tsx` (search, favorites, scheduling editor) — currently
   covered only indirectly through other tests.

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

# ADR-009: One-day "streak freeze" grace tolerance for the current streak

- Status: Accepted
- Date: 2026-07-26

## Context

`computeStreaks` counted the "current" streak by walking backward from today and stopping at
the very first day with no completion. In practice this meant a single bad day — sick, traveling,
just forgot — zeroed out a real accomplishment (e.g. a genuine 30-day streak) back to 0. For a
product explicitly aimed at people who procrastinate or forget things, that's the worst possible
feedback loop: the one moment they most need encouragement, the app tells them they've lost
everything.

## Decision

`current` now tolerates exactly one missed day without resetting to 0; two consecutive missed
days still end it. Today itself is never treated as a "miss" for this calculation (the day isn't
over yet), so `current` reflects the real completed streak even before the user has acted today.
`hasToday` is still tracked and reported separately, so the existing "Riesgo: hoy aún vas en 0"
copy keeps working correctly alongside the preserved streak number.

The **best** streak (historical record) is intentionally NOT given this tolerance — it keeps
requiring perfect consecutive days, so it stays a meaningful, stable record rather than something
that could retroactively grow just from a code change.

## Consequences

Positive:

- A single missed day no longer erases weeks of real progress from the number the user sees.
- No new state, no persistence, no "you have N freezes left" budget UI to build or explain —
  the rule is simple enough to state in one line of dashboard copy.

Trade-offs:

- "Current streak" and "best streak" now use different rules (grace vs strict), which needs the
  one-line explanatory copy in the Rachas widget to avoid looking like a bug.
- Someone who misses two days in a row still gets reset, same as before — this is a smoothing of
  the edge case, not a general safety net.

## Alternatives considered

- A limited "freeze" budget (e.g. 1 per week, consumed automatically): more faithful to how
  commercial habit apps do it, but requires persisted state, reset logic, and UI to communicate
  remaining freezes — postponed as unnecessary complexity for the value gained here.
- Applying the same grace tolerance to `best`: rejected — would make the historical record less
  meaningful and could look like retroactively rewriting past performance.

## References

- [frontend/src/features/dashboard/utils/dashboardUtils.ts](../../frontend/src/features/dashboard/utils/dashboardUtils.ts)
- [frontend/src/pages/DashboardPage.tsx](../../frontend/src/pages/DashboardPage.tsx)

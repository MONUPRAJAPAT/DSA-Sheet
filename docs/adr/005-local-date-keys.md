# ADR-005: Calendar days as user-local `YYYY-MM-DD` keys

**Status:** Accepted · **Date:** 2026-10-20

## Context

"What's due today?", "Did I keep my streak?" and "Schedule a revision in 3 days" are questions about the **student's local day**. Storing UTC instants and converting everywhere causes off-by-one-day bugs, for example a problem solved at 00:30 IST counting as the previous day.

## Decision

- Calendar events store `date` as a `YYYY-MM-DD` string in the student's timezone, plus optional `HH:mm` times.
- The client sends `X-Timezone` (IANA) on every request; the server validates it and uses it to compute "today".
- Streak and heatmap aggregations use MongoDB's `$dateToString` with that timezone.
- Instants that are genuinely instants (`solvedAt`, `createdAt`) stay UTC `Date`s.

## Consequences

- ✅ Correct day boundaries for every student; trivial, indexable range queries (`date >= from && date <= to`).
- ✅ Matches how calendars and iCalendar all-day events work.
- ➖ If a student changes timezone, previously planned days keep their calendar date. That is the expected calendar behaviour.

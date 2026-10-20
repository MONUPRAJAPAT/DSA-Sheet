# ADR-002: Store progress as one document per (user, problem)

**Status:** Accepted · **Date:** 2026-10-20

## Context

Progress is the hottest data in the system: every checkbox click writes it, and every page reads it. Options:

1. an embedded `progress[]` array on the user document;
2. a map `{ problemId: status }` on the user document;
3. a separate `userProgress` collection.

## Decision

Option 3: a `userProgress` collection with a **unique compound index `{ userId, problemId }`**, written with an **upsert**. A missing row means "todo". `chapterId` and `difficulty` are copied in on insert.

## Consequences

- ✅ Writes are O(1), touch one small document, and are idempotent. Retries and double-clicks are safe.
- ✅ No unbounded documents (16 MB limit) and no write contention on a single hot user document.
- ✅ Aggregations (per difficulty, per chapter, streak) are single indexed scans, with no `$lookup`.
- ✅ `userId` is a natural future shard key.
- ➖ Loading progress means reading up to 200 small documents instead of one. That is measured at a few milliseconds and irrelevant at this size.

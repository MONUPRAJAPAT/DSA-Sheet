# API Design

REST over HTTPS, JSON, versioned under **`/api/v1`**. The interactive OpenAPI 3.1 docs are served by the API itself at **`/api/docs`** (raw spec at `/api/openapi.json`). Request schemas in the docs come from the same Zod schemas the server validates with, so the docs cannot drift from the code.

## Conventions

| Concern         | Convention                                                                                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Envelope**    | Success: `{ "success": true, "data": … }` · Error: `{ "success": false, "error": { "code", "message", "details?" } }`                                                                                                                                |
| **Auth**        | `Authorization: Bearer <accessToken>` (JWT, 15 min). The refresh token is an httpOnly cookie scoped to `/api/v1/auth`                                                                                                                                |
| **Timezone**    | Clients send `X-Timezone: Asia/Kolkata` (IANA). Streaks, "today", revisions and the calendar use the student's local day                                                                                                                             |
| **Validation**  | Every body, query and path parameter is validated with Zod. A failure returns `400 VALIDATION_ERROR` listing **all** issues                                                                                                                          |
| **Idempotency** | `PUT /progress/:problemId` is an upsert: repeating it never creates duplicates                                                                                                                                                                       |
| **Caching**     | Private responses send `Cache-Control: no-store`. The public sheet sends `ETag` + `Cache-Control: public, max-age=60, stale-while-revalidate=300` and answers `304` on `If-None-Match`                                                               |
| **Rate limits** | 300 req/min/IP across the API. Login: 10 **failed** attempts / 15 min per IP + email (successes don't count). Register: 10 / hour per IP. Demo: 60 / 15 min per IP. `429 RATE_LIMITED` with `RateLimit-*` headers and a message saying when to retry |
| **Tracing**     | Every response carries `X-Request-Id` (also in the structured logs)                                                                                                                                                                                  |

### Error codes

| HTTP | `code`                                                   | When                                                                                                 |
| ---- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR` / `BAD_REQUEST`                       | Invalid input, malformed JSON, invalid id                                                            |
| 401  | `UNAUTHORIZED` / `TOKEN_EXPIRED` / `INVALID_CREDENTIALS` | Missing or expired token, wrong password                                                             |
| 403  | `FORBIDDEN`                                              | Role not allowed                                                                                     |
| 404  | `NOT_FOUND`                                              | Unknown route, or a resource that doesn't exist **or belongs to another user** (no information leak) |
| 409  | `CONFLICT`                                               | Email already registered                                                                             |
| 429  | `RATE_LIMITED`                                           | Too many requests                                                                                    |
| 500  | `INTERNAL_ERROR`                                         | Unexpected error (details hidden in production, logged with the request id)                          |

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must contain a number",
    "details": [
      { "path": "body.email", "message": "Enter a valid email" },
      { "path": "body.password", "message": "Password must contain a number" }
    ]
  }
}
```

---

## Endpoints

### Auth: `/api/v1/auth`

| Method | Path          | Auth   | Description                                                           |
| ------ | ------------- | ------ | --------------------------------------------------------------------- |
| POST   | `/register`   | —      | Create an account → `201 { user, accessToken }` + sets refresh cookie |
| POST   | `/login`      | —      | Log in → `{ user, accessToken }` + sets refresh cookie                |
| POST   | `/demo`       | —      | Log in as the seeded demo student (for evaluators)                    |
| POST   | `/refresh`    | cookie | **Rotates** the refresh token and returns a new access token          |
| POST   | `/logout`     | cookie | Revokes this device's session and clears the cookie                   |
| POST   | `/logout-all` | Bearer | Revokes every session of the user                                     |
| GET    | `/me`         | Bearer | Current user                                                          |

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "asha@example.com", "password": "Passw0rd!" }
```

```http
HTTP/1.1 200 OK
Set-Cookie: dsa_rt=<opaque>; Path=/api/v1/auth; Expires=…; HttpOnly; Secure; SameSite=Strict

{
  "success": true,
  "data": {
    "user": {
      "id": "6ad6…a1", "name": "Asha", "email": "asha@example.com", "role": "student",
      "preferences": { "dailyGoal": 3, "studyDays": [1,2,3,4,5,6], "targetDate": null },
      "lastActive": { "problemId": null, "at": null },
      "createdAt": "2026-10-20T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs…"
  }
}
```

### Sheet: `/api/v1/sheet` (public, cacheable)

| Method | Path | Description                                                                                    |
| ------ | ---- | ---------------------------------------------------------------------------------------------- |
| GET    | `/`  | The whole hierarchy: `chapters[] → topics[] → problems[]`, plus totals and a content `version` |

```json
{
  "success": true,
  "data": {
    "version": "b0a0b5440596",
    "totals": { "problems": 200, "easy": 55, "medium": 120, "hard": 25 },
    "chapters": [
      {
        "id": "…",
        "title": "Arrays",
        "slug": "arrays",
        "order": 1,
        "icon": "brackets",
        "problemCount": 21,
        "description": "The foundation of DSA — …",
        "topics": [
          {
            "id": "…",
            "title": "Prefix Sum",
            "slug": "prefix-sum",
            "difficulty": "Medium",
            "order": 2,
            "description": "Pre-compute running totals to answer range queries in O(1).",
            "resources": {
              "youtube": "https://www.youtube.com/watch?v=…",
              "practice": {
                "platform": "LeetCode",
                "url": "https://leetcode.com/problem-list/prefix-sum/"
              },
              "article": "https://www.geeksforgeeks.org/dsa/prefix-sum-array-implementation-applications-competitive-programming/"
            },
            "problems": [
              {
                "id": "…",
                "title": "Subarray Sum Equals K",
                "slug": "subarray-sum-equals-k",
                "difficulty": "Medium",
                "order": 4,
                "tags": ["array", "hash-table", "prefix-sum"],
                "resources": {
                  "youtube": "…",
                  "practice": {
                    "platform": "LeetCode",
                    "url": "https://leetcode.com/problems/subarray-sum-equals-k/"
                  },
                  "article": "…"
                }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

Content is identical for every student, so it is separated from per-user data. That lets CloudFront and browsers cache it, which removes the largest payload (~100 KB) from the API's hot path.

### Progress: `/api/v1/progress` (Bearer)

| Method | Path           | Description                                                                                                 |
| ------ | -------------- | ----------------------------------------------------------------------------------------------------------- |
| GET    | `/`            | All of the student's progress rows (`problemId, status, starred, notes, solvedAt, updatedAt`)               |
| PUT    | `/:problemId`  | **Idempotent upsert** of `{ status?, starred?, notes? }` (at least one field)                               |
| GET    | `/stats`       | Dashboard: solved/total, per difficulty, per chapter, streak, revisions due, **`continue`** (resume target) |
| GET    | `/heatmap`     | `[{ date, count }]` solved per local day, last 365 days                                                     |
| POST   | `/last-active` | `{ problemId }`: remember the last opened problem                                                           |
| DELETE | `/`            | Reset all progress (and pending spaced-repetition revisions)                                                |

```http
PUT /api/v1/progress/6ad66c29342fdea543b150ef
Authorization: Bearer …
X-Timezone: Asia/Kolkata

{ "status": "solved" }
```

Side effects, in the same request:

1. `lastActive` is updated, so the next login resumes here.
2. Pending **study** tasks for this problem are marked done.
3. **Spaced-repetition** revisions are scheduled at +1, +3, +7 and +21 days.

Un-ticking removes the pending revisions.

```json
GET /api/v1/progress/stats →
{
  "solved": 34, "total": 200,
  "byDifficulty": { "Easy": { "solved": 16, "total": 55 }, "Medium": { "solved": 16, "total": 120 }, "Hard": { "solved": 2, "total": 25 } },
  "byChapter": [{ "chapterId": "…", "solved": 21, "total": 21 }],
  "streak": { "current": 16, "longest": 16 },
  "revisionsDue": 7,
  "continue": { "problemId": "…", "title": "Intersection of Two Arrays", "chapterTitle": "Hashing", "topicTitle": "Hash Map & Set Basics" }
}
```

### Calendar: `/api/v1/calendar` (Bearer)

| Method | Path                                    | Description                                                                                                        |
| ------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| GET    | `/events?from=YYYY-MM-DD&to=YYYY-MM-DD` | Events in a range (month/week view). Each event includes `overdue` and the linked `problem`                        |
| POST   | `/events`                               | Create `{ date, type?, problemId?, title?, startTime?, endTime?, notes? }`                                         |
| PATCH  | `/events/:id`                           | Reschedule (drag and drop), edit, or complete `{ status: "done" }`. Completing a study task also ticks the problem |
| DELETE | `/events/:id`                           | Delete                                                                                                             |
| GET    | `/agenda`                               | Today's tasks + every overdue pending task                                                                         |
| POST   | `/rollover`                             | Move overdue tasks to today; originals are kept as `missed` (history)                                              |
| GET    | `/plan`                                 | Active auto study plan (404 if none)                                                                               |
| POST   | `/plan`                                 | Generate plan `{ startDate, targetDate, dailyGoal, studyDays[], chapterIds?, replaceExisting? }`                   |
| DELETE | `/plan`                                 | Remove the plan and its pending tasks                                                                              |
| GET    | `/export.ics`                           | RFC 5545 iCalendar download (Google / Apple / Outlook)                                                             |

```json
POST /api/v1/calendar/plan
{ "startDate": "2026-10-20", "targetDate": "2026-12-15", "dailyGoal": 3, "studyDays": [1,2,3,4,5,6] }

201 →
{ "created": 147, "problemsScheduled": 147, "firstDate": "2026-10-20", "lastDate": "2026-12-15",
  "fitsBeforeTarget": false, "unscheduled": 19, "suggestedDailyGoal": 4 }
```

### Users: `/api/v1/users` (Bearer)

| Method | Path  | Description                                           |
| ------ | ----- | ----------------------------------------------------- |
| PATCH  | `/me` | Update `name`, `dailyGoal`, `studyDays`, `targetDate` |

### Health

| Method | Path             | Description                                                                                        |
| ------ | ---------------- | -------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/health` | `200 { status: "ok", db: "up" }` or `503` when the DB is unreachable. Used by the ALB health check |

---

## Design decisions

- **Resource-oriented REST, not RPC.** Progress is addressed by problem (`PUT /progress/:problemId`), so the client never needs to know a progress row's id, and retries are safe.
- **Public vs. private split** (`/sheet` vs `/progress`). Public data can be cached at the edge, and private data is never cached.
- **Server-side side effects** (revisions, study-task sync) keep every client consistent; the web UI is not the only possible client.
- **404 instead of 403 for other users' resources**, so ids cannot be probed.
- **Versioned prefix** (`/api/v1`) leaves room for breaking changes without breaking deployed clients.

# Load test results

**Tool:** [k6](https://k6.io) ([`k6.js`](./k6.js)) · **Target:** one production-build API process (`node dist/server.js`, single Node.js event loop, no clustering) + MongoDB 8.2 in Docker · **Machine:** a developer laptop that was also running MongoDB, Docker and k6 itself, so these numbers are a conservative floor · **Date:** 2026-10-20

## 1. Realistic student sessions: 500 concurrent students

Each virtual student repeatedly: opens the sheet → loads progress → ticks/unticks a random problem (write) → views dashboard stats → opens the month calendar, with 1–3 s think time between actions.

| Metric                                                       | Result                                            |
| ------------------------------------------------------------ | ------------------------------------------------- |
| Peak concurrent students                                     | **500**                                           |
| Requests                                                     | 24,687 (0 failed)                                 |
| Checks passed                                                | **100 %** (24,685 / 24,685)                       |
| Latency (all)                                                | median **5.5 ms** · p95 **28 ms** · p99 **77 ms** |
| Reads p95 / Writes p95                                       | 28 ms / 30 ms                                     |
| Thresholds (p95 read < 300 ms, write < 500 ms, errors < 1 %) | ✅ all passed                                     |

## 2. Capacity: no think time (sheet excluded, served by CloudFront)

Weighted mix: 30 % `GET /progress`, 30 % `PUT /progress/:id`, 20 % `GET /progress/stats`, 20 % `GET /calendar/agenda`.

| Load                            | Throughput                      | Median     | p95              | p99    | Errors  |
| ------------------------------- | ------------------------------- | ---------- | ---------------- | ------ | ------- |
| Constant **600 req/s** for 45 s | 595 req/s                       | **2.3 ms** | 105 ms           | 301 ms | **0 %** |
| Ramp 100 → 1,600 req/s          | saturates at **~800–900 req/s** | 5.6 ms     | 3.2 s (queueing) | 4.0 s  | **0 %** |

**Takeaway:** a single API process handles ~600 req/s comfortably. Past saturation it degrades gracefully (requests queue, nothing fails). Because the API is stateless, capacity scales linearly with ECS tasks behind the load balancer.

## Reproduce

```bash
npm run build -w server
API_RATE_LIMIT=1000000 LOG_LEVEL=warn NODE_ENV=production node --env-file=server/.env server/dist/server.js &
docker run --rm -i -e BASE_URL=http://host.docker.internal:4000 grafana/k6 run - < loadtest/k6.js              # realistic
docker run --rm -i -e MODE=stress -e BASE_URL=http://host.docker.internal:4000 grafana/k6 run - < loadtest/k6.js # capacity
```

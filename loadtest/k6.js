/**
 * k6 load test — models a realistic student session mix.
 *
 *   docker run --rm -i -e BASE_URL=http://host.docker.internal:4000 grafana/k6 run - < loadtest/k6.js
 *   … -e MODE=stress …   → no think time, ramps request rate to find one instance's capacity
 *
 * Mix per iteration (≈ one student "action"): open the sheet (cacheable), load progress,
 * tick/untick a problem (write), view dashboard stats, view this month's calendar.
 * Think time 1–3 s between actions, like a real user.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:4000';
const API = `${BASE}/api/v1`;

const STRESS = __ENV.MODE === 'stress';

export const options = STRESS
  ? {
      // Each iteration = one API request; the sheet is excluded (served by CloudFront in production).
      scenarios: {
        stress: {
          executor: 'ramping-arrival-rate',
          startRate: 100,
          timeUnit: '1s',
          preAllocatedVUs: 300,
          maxVUs: 1500,
          stages: [
            { duration: '20s', target: 400 },
            { duration: '30s', target: 800 },
            { duration: '30s', target: 1200 },
            { duration: '30s', target: 1600 },
          ],
        },
      },
      thresholds: { http_req_failed: ['rate<0.01'] },
    }
  : {
      scenarios: {
        students: {
          executor: 'ramping-vus',
          startVUs: 0,
          stages: [
            { duration: '30s', target: 100 },
            { duration: '1m', target: 300 },
            { duration: '1m', target: 500 },
            { duration: '20s', target: 0 },
          ],
        },
      },
      thresholds: {
        http_req_failed: ['rate<0.01'],
        'http_req_duration{kind:read}': ['p(95)<300'],
        'http_req_duration{kind:write}': ['p(95)<500'],
      },
    };

export function setup() {
  // One token shared by all VUs keeps the test focused on the API, not on bcrypt login cost.
  const res = http.post(`${API}/auth/demo`, null, { headers: { 'X-Timezone': 'Asia/Kolkata' } });
  const token = res.json('data.accessToken');
  const sheet = http.get(`${API}/sheet`).json('data');
  const problemIds = sheet.chapters.flatMap((c) =>
    c.topics.flatMap((t) => t.problems.map((p) => p.id)),
  );
  return { token, problemIds };
}

export default function (data) {
  if (STRESS) return stressRequest(data);
  return studentSession(data);
}

function stressRequest({ token, problemIds }) {
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Timezone': 'Asia/Kolkata',
      'Content-Type': 'application/json',
    },
  };
  const r = Math.random();
  if (r < 0.3) http.get(`${API}/progress`, { ...params, tags: { kind: 'read' } });
  else if (r < 0.6) {
    const id = problemIds[Math.floor(Math.random() * problemIds.length)];
    http.put(`${API}/progress/${id}`, JSON.stringify({ starred: Math.random() < 0.5 }), {
      ...params,
      tags: { kind: 'write' },
    });
  } else if (r < 0.8) http.get(`${API}/progress/stats`, { ...params, tags: { kind: 'read' } });
  else http.get(`${API}/calendar/agenda`, { ...params, tags: { kind: 'read' } });
}

function studentSession({ token, problemIds }) {
  const auth = {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Timezone': 'Asia/Kolkata',
      'Content-Type': 'application/json',
    },
  };
  const read = { ...auth, tags: { kind: 'read' } };
  const write = { ...auth, tags: { kind: 'write' } };

  check(http.get(`${API}/sheet`, { tags: { kind: 'read' } }), {
    'sheet 200': (r) => r.status === 200,
  });
  sleep(1 + Math.random());
  check(http.get(`${API}/progress`, read), { 'progress 200': (r) => r.status === 200 });
  sleep(1 + Math.random() * 2);

  const id = problemIds[Math.floor(Math.random() * problemIds.length)];
  const status = Math.random() < 0.5 ? 'solved' : 'todo';
  check(http.put(`${API}/progress/${id}`, JSON.stringify({ status }), write), {
    'tick 200': (r) => r.status === 200,
  });
  sleep(1 + Math.random() * 2);

  check(http.get(`${API}/progress/stats`, read), { 'stats 200': (r) => r.status === 200 });
  sleep(1 + Math.random());
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  check(http.get(`${API}/calendar/events?from=${from}&to=${to}`, read), {
    'calendar 200': (r) => r.status === 200,
  });
  sleep(1 + Math.random() * 2);
}

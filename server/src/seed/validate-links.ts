/**
 * Link validator: `npm run validate:links`
 * Re-checks every resource URL in src/seed/data against the live platforms so a dead link
 * never reaches students. Exits non-zero on any failure (runs on a weekly CI schedule).
 *
 *  • YouTube      → oEmbed endpoint (404s for deleted / private videos)
 *  • LeetCode     → GraphQL: problem / tag exists, difficulty matches, not premium-only
 *  • Codeforces   → public API problem list
 *  • Articles     → HTTP 200
 */
import { loadChapterFiles } from './load';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const CONCURRENCY = 6;

interface Check {
  label: string;
  url: string;
  expectDifficulty?: string;
}

/** fetch with retries — a network blip should not fail the build, only a real dead link should. */
async function get(url: string, init: RequestInit = {}, attempts = 3): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': UA, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status >= 500 && i < attempts) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

let cfIds: Set<string> | null = null;
async function codeforcesIds() {
  if (!cfIds) {
    const data = (await (
      await get('https://codeforces.com/api/problemset.problems')
    ).json()) as any;
    cfIds = new Set(
      data.result.problems.map(
        (p: { contestId: number; index: string }) => `${p.contestId}/${p.index}`,
      ),
    );
  }
  return cfIds;
}

async function leetcode(query: string, variables: Record<string, string>) {
  const res = await get('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
    body: JSON.stringify({ query, variables }),
  });
  return ((await res.json()) as any).data;
}

async function check({ url, expectDifficulty }: Check): Promise<string | null> {
  const u = new URL(url);
  if (u.hostname.endsWith('youtube.com')) {
    const res = await get(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    );
    return res.ok ? null : `YouTube video unavailable (${res.status})`;
  }
  if (u.hostname === 'leetcode.com') {
    const list = u.pathname.match(/^\/problem-list\/([^/]+)\/?$/);
    if (list) {
      const data = await leetcode('query q($s:String!){topicTag(slug:$s){slug}}', { s: list[1]! });
      return data?.topicTag ? null : 'LeetCode tag not found';
    }
    const slug = u.pathname.match(/^\/problems\/([^/]+)\/?$/)?.[1];
    if (!slug) return 'Unrecognised LeetCode URL';
    const data = await leetcode(
      'query q($s:String!){question(titleSlug:$s){difficulty isPaidOnly}}',
      { s: slug },
    );
    if (!data?.question) return 'LeetCode problem not found';
    if (data.question.isPaidOnly) return 'LeetCode problem is premium-only';
    if (expectDifficulty && data.question.difficulty !== expectDifficulty)
      return `Difficulty mismatch: sheet says ${expectDifficulty}, LeetCode says ${data.question.difficulty}`;
    return null;
  }
  if (u.hostname === 'codeforces.com') {
    const id = u.pathname.match(/\/problem\/(\d+)\/([A-Z]\d?)/);
    return id && (await codeforcesIds()).has(`${id[1]}/${id[2]}`)
      ? null
      : 'Codeforces problem not found';
  }
  const res = await get(url, { redirect: 'follow' });
  return res.ok ? null : `HTTP ${res.status}`;
}

async function main() {
  const checks: Check[] = [];
  for (const ch of loadChapterFiles()) {
    for (const t of ch.topics) {
      const tl = `${ch.title} › ${t.title}`;
      checks.push({ label: `${tl} (video)`, url: t.resources.youtube });
      checks.push({ label: `${tl} (practice)`, url: t.resources.practice.url });
      checks.push({ label: `${tl} (article)`, url: t.resources.article });
      for (const p of t.problems) {
        const pl = `${tl} › ${p.title}`;
        checks.push({ label: `${pl} (video)`, url: p.resources.youtube });
        checks.push({
          label: `${pl} (practice)`,
          url: p.resources.practice.url,
          expectDifficulty: p.difficulty,
        });
        checks.push({ label: `${pl} (article)`, url: p.resources.article });
      }
    }
  }

  const failures: string[] = [];
  let done = 0;
  const queue = [...checks];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let c = queue.shift(); c; c = queue.shift()) {
        let error: string | null;
        try {
          error = await check(c);
        } catch (err) {
          error = `Request failed: ${(err as Error).message}`;
        }
        if (error) failures.push(`✗ ${c.label}\n    ${c.url}\n    ${error}`);
        if (++done % 50 === 0) console.log(`  checked ${done}/${checks.length}`);
      }
    }),
  );

  if (failures.length) {
    console.error(
      `\n❌ ${failures.length} of ${checks.length} links failed:\n\n${failures.join('\n')}`,
    );
    process.exit(1);
  }
  console.log(`✅ All ${checks.length} links are live and consistent.`);
}

main();

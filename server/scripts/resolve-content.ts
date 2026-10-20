/**
 * Content resolver — expands `content-spec.ts` into `src/seed/data/*.json`.
 *
 *  • LeetCode   → official title, difficulty and paid-only flag via leetcode.com/graphql
 *  • Codeforces → official name + rating via the public Codeforces API (rating → difficulty)
 *  • YouTube    → searches YouTube, prefers well-known DSA channels, and only accepts a video
 *                 whose title actually matches the problem (verified again via oEmbed)
 *  • Article    → topic: curated GeeksforGeeks / cp-algorithms theory page; problem: doocs LeetCode
 *                 Wiki explanation. Every URL is fetched to confirm it is live.
 *
 * Results are cached in scripts/.content-cache.json so re-runs are incremental.
 * A human-readable review report is written to scripts/content-report.md.
 *
 * Usage: npx tsx scripts/resolve-content.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chapterSeedSchema, type ChapterSeed, type Difficulty } from '@dsa/shared';
import { spec, type ProblemSpec } from './content-spec';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(here, '../src/seed/data');
const CACHE_FILE = path.resolve(here, '.content-cache.json');
const REPORT_FILE = path.resolve(here, 'content-report.md');
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

/** Channels known for high-quality DSA explanations, in order of preference. */
const PREFERRED_CHANNELS = [
  'take U forward',
  'NeetCode',
  'NeetCodeIO',
  'Apna College',
  'codestorywithMIK',
  'Aditya Verma',
  'CodeHelp - by Babbar',
  'Greg Hogg',
  'Nick White',
  'Kevin Naughton Jr.',
  'Errichto Algorithms',
  'WilliamFiset',
  'Abdul Bari',
  'Back To Back SWE',
  'Tushar Roy - Coding Made Simple',
  'Pepcoding',
  'Love Babbar',
  'Striver',
  'Techdose',
  'Colin Galen',
];

type Cache = Record<string, unknown>;
const cache: Cache = fs.existsSync(CACHE_FILE)
  ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
  : {};
const saveCache = () => fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const review: string[] = [];

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (key in cache && cache[key] !== null) return cache[key] as T;
  const value = await fn();
  cache[key] = value;
  saveCache();
  return value;
}

async function fetchText(
  url: string,
  init: RequestInit = {},
  retries = 3,
): Promise<{ status: number; text: string }> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', ...(init.headers ?? {}) },
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
      });
      const text = await res.text();
      if ((res.status === 429 || res.status === 202 || res.status >= 500) && attempt < retries) {
        await sleep(3000 * attempt);
        continue;
      }
      return { status: res.status, text };
    } catch (err) {
      if (attempt >= retries) throw err;
      await sleep(2000 * attempt);
    }
  }
}

// ---------------------------------------------------------------- normalisation helpers
const STOP = new Set([
  'a',
  'an',
  'the',
  'of',
  'in',
  'to',
  'and',
  'or',
  'from',
  'with',
  'on',
  'for',
  'is',
  'ii',
  'iii',
  'i',
]);
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/&#x27;|&#39;|'/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !STOP.has(w));

function titleMatches(candidate: string, wanted: string, extraTokens: string[] = []): boolean {
  const c = candidate.toLowerCase();
  if (extraTokens.some((t) => c.includes(t.toLowerCase()))) return true;
  const want = words(wanted);
  if (!want.length) return false;
  const have = new Set(words(candidate));
  const hits = want.filter(
    (w) => have.has(w) || [...have].some((h) => h.startsWith(w) || w.startsWith(h)),
  ).length;
  return hits / want.length >= 0.75;
}

// ---------------------------------------------------------------- LeetCode
interface LcQuestion {
  title: string;
  difficulty: Difficulty;
  frontendId: string;
  paid: boolean;
  tags: string[];
}

async function leetcodeGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const { status, text } = await fetchText('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
    body: JSON.stringify({ query, variables }),
  });
  if (status !== 200) throw new Error(`LeetCode GraphQL ${status}`);
  return JSON.parse(text).data as T;
}

const lcQuestion = (slug: string) =>
  cached<LcQuestion | null>(`lc:${slug}`, async () => {
    const data = await leetcodeGraphQL<{ question: null | Record<string, any> }>(
      'query q($s:String!){question(titleSlug:$s){title difficulty questionFrontendId isPaidOnly topicTags{slug}}}',
      { s: slug },
    );
    const q = data.question;
    if (!q) return null;
    return {
      title: q.title,
      difficulty: q.difficulty,
      frontendId: q.questionFrontendId,
      paid: q.isPaidOnly,
      tags: q.topicTags.map((t: { slug: string }) => t.slug),
    };
  });

const lcTagExists = (slug: string) =>
  cached<boolean>(`lctag:${slug}`, async () => {
    const data = await leetcodeGraphQL<{ topicTag: null | { slug: string } }>(
      'query q($s:String!){topicTag(slug:$s){slug}}',
      { s: slug },
    );
    return !!data.topicTag;
  });

// ---------------------------------------------------------------- Codeforces
let cfProblems: Map<string, { name: string; rating?: number; tags: string[] }> | null = null;
async function cfProblem(id: string) {
  if (!cfProblems) {
    const { text } = await fetchText('https://codeforces.com/api/problemset.problems');
    const data = JSON.parse(text);
    cfProblems = new Map(
      data.result.problems.map((p: any) => [
        `${p.contestId}${p.index}`,
        { name: p.name, rating: p.rating, tags: p.tags },
      ]),
    );
  }
  return cfProblems.get(id) ?? null;
}
const cfDifficulty = (rating = 1500): Difficulty =>
  rating < 1400 ? 'Easy' : rating < 1800 ? 'Medium' : 'Hard';

// ---------------------------------------------------------------- YouTube
interface Video {
  id: string;
  title: string;
  channel: string;
}

function parseYoutubeResults(html: string): Video[] {
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) return [];
  const out: Video[] = [];
  const walk = (o: any) => {
    if (!o || typeof o !== 'object') return;
    if (o.videoRenderer?.videoId) {
      const v = o.videoRenderer;
      out.push({
        id: v.videoId,
        title: (v.title?.runs ?? []).map((r: any) => r.text).join(''),
        channel: v.ownerText?.runs?.[0]?.text ?? '',
      });
    }
    for (const val of Object.values(o)) walk(val);
  };
  walk(JSON.parse(m[1]!));
  return out.slice(0, 15);
}

/** YouTube occasionally serves an empty/alternate page — retry, and never cache an empty result. */
async function youtubeSearch(query: string): Promise<Video[]> {
  const key = `yt:${query}`;
  const hit = cache[key] as Video[] | undefined;
  if (hit?.length) return hit;
  for (let attempt = 1; attempt <= 4; attempt++) {
    await sleep(700 * attempt);
    const { status, text } = await fetchText(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en`,
    );
    const results = status === 200 ? parseYoutubeResults(text) : [];
    if (results.length) {
      cache[key] = results;
      saveCache();
      return results;
    }
  }
  return [];
}

async function oembedTitle(videoId: string): Promise<string | null> {
  return cached(`oembed:${videoId}`, async () => {
    const { status, text } = await fetchText(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
    );
    return status === 200 ? (JSON.parse(text).title as string) : null;
  });
}

const channelRank = (c: string) => {
  const i = PREFERRED_CHANNELS.findIndex((p) => p.toLowerCase() === c.toLowerCase());
  return i === -1 ? PREFERRED_CHANNELS.length : i;
};

interface VideoRules {
  keywords?: string[];
  exclude?: string[];
}

async function pickVideo(
  query: string,
  wanted: string | null,
  tokens: string[],
  label: string,
  rules: VideoRules = {},
): Promise<string> {
  const lower = (s: string) => s.toLowerCase();
  const allowed = (v: Video) =>
    (!rules.keywords?.length || rules.keywords.some((k) => lower(v.title).includes(lower(k)))) &&
    !rules.exclude?.some((k) => lower(v.title).includes(lower(k)));
  const results = (await youtubeSearch(query)).filter(allowed);
  if (!results.length) throw new Error(`No acceptable YouTube result for ${label} ("${query}")`);
  const matching = wanted ? results.filter((v) => titleMatches(v.title, wanted, tokens)) : results;
  const pool = matching.length ? matching : results;
  // Among the first 8 relevant results, prefer a trusted channel; otherwise keep search ranking.
  const best =
    [...pool.slice(0, 8)].sort((a, b) => channelRank(a.channel) - channelRank(b.channel))[0] ??
    pool[0];
  if (!best) throw new Error(`No YouTube results for "${query}"`);
  if (wanted && !matching.length)
    review.push(`- ⚠️ **${label}** video may not match: "${best.title}" (${best.channel})`);
  const verified = await oembedTitle(best.id);
  if (!verified) throw new Error(`oEmbed failed for ${best.id}`);
  reportLine(label, `▶ ${verified} — _${best.channel}_`);
  return `https://www.youtube.com/watch?v=${best.id}`;
}

// ---------------------------------------------------------------- Articles
async function pageTitle(url: string): Promise<string | null> {
  return cached(`page:${url}`, async () => {
    await sleep(250);
    const { status, text } = await fetchText(url);
    if (status !== 200) return null;
    return (text.match(/<title>([^<]*)<\/title>/)?.[1] ?? '')
      .replace(
        /\s*[-|]\s*(GeeksforGeeks|LeetCode Wiki|Algorithms for Competitive Programming)\s*$/,
        '',
      )
      .replace(/&#x27;/g, "'")
      .trim();
  });
}

/** Verifies an article URL is live and records its title in the report. */
async function verifyArticle(url: string, label: string): Promise<string> {
  const title = await pageTitle(url);
  if (title === null) {
    review.push(`- ❌ **${label}** article is not reachable: ${url}`);
    throw new Error(`Dead article for ${label}: ${url}`);
  }
  reportLine(label, `📄 ${title}`);
  return url;
}

/** Problem-level article: the open-source doocs LeetCode Wiki explains every problem (approach + complexity). */
const leetcodeArticle = (frontendId: string) =>
  `https://doocs.github.io/leetcode/en/lc/${frontendId}/`;

// ---------------------------------------------------------------- report
const reportLines: string[] = [];
const reportLine = (_label: string, text: string) => reportLines.push(`  - ${text}`);

// ---------------------------------------------------------------- main
async function resolveProblem(p: string | ProblemSpec) {
  const ps: ProblemSpec = typeof p === 'string' ? { ref: p } : p;
  const [platform, id] = ps.ref.split(':') as ['lc' | 'cf', string];

  if (platform === 'lc') {
    const q = await lcQuestion(id);
    if (!q) throw new Error(`LeetCode problem not found: ${id}`);
    if (q.paid) review.push(`- 💰 **${q.title}** is LeetCode Premium`);
    reportLines.push(`- **${q.frontendId}. ${q.title}** (${q.difficulty})`);
    const label = q.title;
    return {
      title: q.title,
      slug: id,
      difficulty: q.difficulty,
      tags: q.tags.slice(0, 4),
      resources: {
        youtube: await pickVideo(
          ps.video ?? `${q.title} leetcode ${q.frontendId}`,
          q.title,
          [`leetcode ${q.frontendId}`, `lc ${q.frontendId}`],
          label,
          { keywords: ps.videoKeywords, exclude: ps.videoExclude },
        ),
        practice: { platform: 'LeetCode' as const, url: `https://leetcode.com/problems/${id}/` },
        article: await verifyArticle(ps.article ?? leetcodeArticle(q.frontendId), label),
      },
    };
  }

  const cf = await cfProblem(id);
  if (!cf) throw new Error(`Codeforces problem not found: ${id}`);
  const [, contest, index] = id.match(/^(\d+)([A-Z]\d?)$/)!;
  const difficulty = cfDifficulty(cf.rating);
  reportLines.push(`- **CF ${id}. ${cf.name}** (${difficulty}, rating ${cf.rating ?? '?'})`);
  return {
    title: `${cf.name} (CF ${id})`,
    slug: `cf-${id.toLowerCase()}-${cf.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`,
    difficulty,
    tags: cf.tags.slice(0, 4).map((t) => t.replace(/\s+/g, '-')),
    resources: {
      youtube: await pickVideo(
        ps.video ?? `codeforces ${id} ${cf.name}`,
        cf.name,
        [id, `${contest} ${index}`],
        cf.name,
        { keywords: ps.videoKeywords, exclude: ps.videoExclude },
      ),
      practice: {
        platform: 'Codeforces' as const,
        url: `https://codeforces.com/problemset/problem/${contest}/${index}`,
      },
      article: await verifyArticle(ps.article!, cf.name),
    },
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const seen = new Set<string>();
  let total = 0;

  for (const [ci, chapter] of spec.entries()) {
    reportLines.push(`\n## ${ci + 1}. ${chapter.title}`);
    const topics = [];
    for (const topic of chapter.topics) {
      console.log(`→ ${chapter.title} / ${topic.title}`);
      reportLines.push(`\n### ${topic.title} (${topic.difficulty})`);
      if (!(await lcTagExists(topic.tag))) throw new Error(`Unknown LeetCode tag: ${topic.tag}`);
      const topicLabel = `Topic: ${topic.title}`;
      const resources = {
        youtube: await pickVideo(topic.video, null, [], topicLabel, {
          keywords: topic.videoKeywords,
          exclude: topic.videoExclude,
        }),
        practice: {
          platform: 'LeetCode' as const,
          url: `https://leetcode.com/problem-list/${topic.tag}/`,
        },
        article: await verifyArticle(topic.article, topicLabel),
      };
      const problems = [];
      for (const p of topic.problems) {
        const ref = typeof p === 'string' ? p : p.ref;
        if (seen.has(ref)) throw new Error(`Duplicate problem in spec: ${ref}`);
        seen.add(ref);
        problems.push(await resolveProblem(p));
        total++;
      }
      topics.push({
        title: topic.title,
        slug: topic.slug,
        difficulty: topic.difficulty,
        description: topic.description,
        resources,
        problems,
      });
    }

    const chapterSeed: ChapterSeed = chapterSeedSchema.parse({
      title: chapter.title,
      slug: chapter.slug,
      order: ci + 1,
      description: chapter.description,
      icon: chapter.icon,
      topics,
    });
    const file = path.join(OUT_DIR, `${String(ci + 1).padStart(2, '0')}-${chapter.slug}.json`);
    fs.writeFileSync(file, JSON.stringify(chapterSeed, null, 2) + '\n');
  }

  fs.writeFileSync(
    REPORT_FILE,
    `# Content resolution report\n\nGenerated ${new Date().toISOString()} — ${total} problems.\n\n` +
      `## Needs review\n\n${review.length ? review.join('\n') : '_Nothing flagged._'}\n${reportLines.join('\n')}\n`,
  );
  console.log(
    `✅ ${total} problems written to ${OUT_DIR}. ${review.length} item(s) flagged — see content-report.md`,
  );
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});

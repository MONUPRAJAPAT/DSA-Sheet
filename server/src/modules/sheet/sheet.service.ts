import crypto from 'node:crypto';
import type { ChapterDTO, ProblemDTO, SheetDTO, TopicDTO } from '@dsa/shared';
import { ChapterModel, ProblemModel, TopicModel } from '../../models';

/**
 * The sheet (chapters → topics → problems) is identical for every student and changes
 * only when content is edited. It is built once, cached in memory with a content hash,
 * and served with an ETag so browsers / CloudFront can revalidate cheaply.
 */
const TTL_MS = 5 * 60 * 1000;
let cache: { sheet: SheetDTO; etag: string; expiresAt: number } | null = null;

export function invalidateSheetCache() {
  cache = null;
}

export async function getSheet(): Promise<{ sheet: SheetDTO; etag: string }> {
  if (cache && cache.expiresAt > Date.now()) return cache;

  const [chapters, topics, problems] = await Promise.all([
    ChapterModel.find().sort({ order: 1 }).lean(),
    TopicModel.find().sort({ chapterId: 1, order: 1 }).lean(),
    ProblemModel.find().sort({ topicId: 1, order: 1 }).lean(),
  ]);

  const problemsByTopic = new Map<string, ProblemDTO[]>();
  const totals = { problems: 0, easy: 0, medium: 0, hard: 0 };
  for (const p of problems) {
    const dto: ProblemDTO = {
      id: p._id.toString(),
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      resources: p.resources,
      tags: p.tags,
      order: p.order,
    };
    const key = p.topicId.toString();
    problemsByTopic.set(key, [...(problemsByTopic.get(key) ?? []), dto]);
    totals.problems++;
    totals[p.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard']++;
  }

  const topicsByChapter = new Map<string, TopicDTO[]>();
  for (const t of topics) {
    const dto: TopicDTO = {
      id: t._id.toString(),
      title: t.title,
      slug: t.slug,
      difficulty: t.difficulty,
      description: t.description,
      resources: t.resources,
      order: t.order,
      problems: problemsByTopic.get(t._id.toString()) ?? [],
    };
    const key = t.chapterId.toString();
    topicsByChapter.set(key, [...(topicsByChapter.get(key) ?? []), dto]);
  }

  const chapterDTOs: ChapterDTO[] = chapters.map((c) => {
    const chapterTopics = topicsByChapter.get(c._id.toString()) ?? [];
    return {
      id: c._id.toString(),
      title: c.title,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      order: c.order,
      problemCount: chapterTopics.reduce((n, t) => n + t.problems.length, 0),
      topics: chapterTopics,
    };
  });

  const body = JSON.stringify(chapterDTOs);
  const version = crypto.createHash('sha1').update(body).digest('hex').slice(0, 12);
  const sheet: SheetDTO = { chapters: chapterDTOs, totals, version };
  cache = { sheet, etag: `"${version}"`, expiresAt: Date.now() + TTL_MS };
  return cache;
}

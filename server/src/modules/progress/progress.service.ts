import { Types } from 'mongoose';
import {
  REVISION_INTERVALS_DAYS,
  type HeatmapDay,
  type ProgressDTO,
  type StatsDTO,
  type UpdateProgressInput,
} from '@dsa/shared';
import { AppError } from '../../lib/errors';
import { addDays, diffDays, toDateKey } from '../../lib/dates';
import { CalendarEventModel, ProblemModel, UserModel, UserProgressModel } from '../../models';
import { getSheet } from '../sheet/sheet.service';

type ProgressLean = {
  problemId: Types.ObjectId;
  status: ProgressDTO['status'];
  starred: boolean;
  notes: string;
  solvedAt: Date | null;
  updatedAt: Date;
};

const toDTO = (p: ProgressLean): ProgressDTO => ({
  problemId: p.problemId.toString(),
  status: p.status,
  starred: p.starred,
  notes: p.notes,
  solvedAt: p.solvedAt?.toISOString() ?? null,
  updatedAt: p.updatedAt.toISOString(),
});

export async function listProgress(userId: string): Promise<ProgressDTO[]> {
  const rows = await UserProgressModel.find({ userId })
    .select('problemId status starred notes solvedAt updatedAt')
    .lean<ProgressLean[]>();
  return rows.map(toDTO);
}

/**
 * Idempotent upsert of one problem's progress (keyed by the unique {userId, problemId} index).
 * Side effects keep the calendar in sync:
 *  - solved   → pending study events for this problem are completed and
 *               spaced-repetition revisions are scheduled at +1, +3, +7, +21 days
 *  - unsolved → pending spaced-repetition revisions for this problem are removed
 */
export async function updateProgress(
  userId: string,
  problemId: string,
  input: UpdateProgressInput,
  timeZone: string,
): Promise<ProgressDTO> {
  const problem = await ProblemModel.findById(problemId)
    .select('chapterId difficulty title')
    .lean();
  if (!problem) throw AppError.notFound('Problem');

  const previous = await UserProgressModel.findOne({ userId, problemId }).select('status').lean();
  const wasSolved = previous?.status === 'solved';
  const willBeSolved = input.status ? input.status === 'solved' : wasSolved;

  const $set: Record<string, unknown> = { ...input };
  if (input.status) $set.solvedAt = willBeSolved ? (wasSolved ? undefined : new Date()) : null;
  if ($set.solvedAt === undefined) delete $set.solvedAt;

  const doc = await UserProgressModel.findOneAndUpdate(
    { userId, problemId },
    { $set, $setOnInsert: { chapterId: problem.chapterId, difficulty: problem.difficulty } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).lean<ProgressLean>();

  const today = toDateKey(new Date(), timeZone);
  const sideEffects: Promise<unknown>[] = [
    UserModel.updateOne({ _id: userId }, { $set: { lastActive: { problemId, at: new Date() } } }),
  ];

  if (!wasSolved && willBeSolved) {
    sideEffects.push(
      CalendarEventModel.updateMany(
        { userId, problemId, type: 'study', status: 'pending' },
        { $set: { status: 'done' } },
      ),
      CalendarEventModel.deleteMany({
        userId,
        problemId,
        source: 'spaced-repetition',
        status: 'pending',
      }).then(() =>
        CalendarEventModel.insertMany(
          REVISION_INTERVALS_DAYS.map((days, i) => ({
            userId,
            problemId,
            title: `Revise: ${problem.title}`,
            date: addDays(today, days),
            type: 'revision',
            source: 'spaced-repetition',
            revisionStage: i + 1,
          })),
        ),
      ),
    );
  } else if (wasSolved && !willBeSolved) {
    sideEffects.push(
      CalendarEventModel.deleteMany({
        userId,
        problemId,
        source: 'spaced-repetition',
        status: 'pending',
      }),
    );
  }
  await Promise.all(sideEffects);

  return toDTO(doc);
}

export async function setLastActive(userId: string, problemId: string) {
  const exists = await ProblemModel.exists({ _id: problemId });
  if (!exists) throw AppError.notFound('Problem');
  await UserModel.updateOne(
    { _id: userId },
    { $set: { lastActive: { problemId, at: new Date() } } },
  );
}

export async function resetProgress(userId: string) {
  await Promise.all([
    UserProgressModel.deleteMany({ userId }),
    CalendarEventModel.deleteMany({ userId, source: 'spaced-repetition' }),
    UserModel.updateOne({ _id: userId }, { $set: { lastActive: { problemId: null, at: null } } }),
  ]);
}

/** Distinct local days on which the student solved at least one problem, with counts. */
export async function getHeatmap(
  userId: string,
  timeZone: string,
  days = 365,
): Promise<HeatmapDay[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await UserProgressModel.aggregate<{ _id: string; count: number }>([
    { $match: { userId: new Types.ObjectId(userId), status: 'solved', solvedAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$solvedAt', timezone: timeZone } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ date: r._id, count: r.count }));
}

export function computeStreak(
  dayKeys: string[],
  today: string,
): { current: number; longest: number } {
  const sorted = [...new Set(dayKeys)].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && diffDays(sorted[i]!, sorted[i - 1]!) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  // The current streak is alive if the last solve was today or yesterday.
  let current = 0;
  const last = sorted.at(-1);
  if (last && diffDays(today, last) <= 1) {
    current = 1;
    for (let i = sorted.length - 1; i > 0 && diffDays(sorted[i]!, sorted[i - 1]!) === 1; i--)
      current++;
  }
  return { current, longest };
}

export async function getStats(userId: string, timeZone: string): Promise<StatsDTO> {
  const uid = new Types.ObjectId(userId);
  const today = toDateKey(new Date(), timeZone);

  const [{ sheet }, solvedRows, heatmap, revisionsDue, user] = await Promise.all([
    getSheet(),
    UserProgressModel.find({ userId: uid, status: 'solved' }).select('problemId').lean(),
    getHeatmap(userId, timeZone, 730),
    CalendarEventModel.countDocuments({
      userId: uid,
      type: 'revision',
      status: 'pending',
      date: { $lte: today },
    }),
    UserModel.findById(uid).select('lastActive').lean(),
  ]);

  const solved = new Set(solvedRows.map((r) => r.problemId.toString()));

  // Flatten the sheet in its natural order — used for totals and "continue where you left off".
  const flat = sheet.chapters.flatMap((c) =>
    c.topics.flatMap((t) =>
      t.problems.map((p) => ({
        ...p,
        chapterId: c.id,
        chapterTitle: c.title,
        topicTitle: t.title,
      })),
    ),
  );

  const byDifficulty: StatsDTO['byDifficulty'] = {
    Easy: { solved: 0, total: 0 },
    Medium: { solved: 0, total: 0 },
    Hard: { solved: 0, total: 0 },
  };
  const byChapter = new Map<string, { solved: number; total: number }>();
  for (const p of flat) {
    const isSolved = solved.has(p.id);
    byDifficulty[p.difficulty].total++;
    if (isSolved) byDifficulty[p.difficulty].solved++;
    const c = byChapter.get(p.chapterId) ?? { solved: 0, total: 0 };
    c.total++;
    if (isSolved) c.solved++;
    byChapter.set(p.chapterId, c);
  }

  // Resume: the last problem the student touched; if already solved, the next unsolved one after it.
  const lastId = user?.lastActive?.problemId?.toString();
  const startIdx = Math.max(
    0,
    flat.findIndex((p) => p.id === lastId),
  );
  let next = flat[startIdx];
  if (!next || solved.has(next.id)) {
    next =
      flat.slice(startIdx).find((p) => !solved.has(p.id)) ?? flat.find((p) => !solved.has(p.id));
  }

  return {
    solved: solved.size,
    total: flat.length,
    byDifficulty,
    byChapter: [...byChapter].map(([chapterId, v]) => ({ chapterId, ...v })),
    streak: computeStreak(
      heatmap.map((h) => h.date),
      today,
    ),
    revisionsDue,
    continue: next
      ? {
          problemId: next.id,
          title: next.title,
          chapterTitle: next.chapterTitle,
          topicTitle: next.topicTitle,
        }
      : null,
  };
}

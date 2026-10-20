/**
 * Idempotent seed: `npm run seed`
 *  1. Validates every chapter file in ./data with Zod (a typo fails loudly, nothing is written).
 *  2. Upserts chapters → topics → problems by slug, so re-running never duplicates content and
 *     existing students' progress keeps pointing at the same problem ids.
 *  3. Removes content no longer present in the files (and progress rows that referenced it).
 *  4. (Re)creates the demo student with realistic history: solves, streak, notes, stars,
 *     an auto study plan and spaced-repetition revisions.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { REVISION_INTERVALS_DAYS, type ChapterSeed } from '@dsa/shared';
import { env } from '../config/env';
import { connectDB, disconnectDB } from '../config/db';
import { logger } from '../lib/logger';
import { addDays, toDateKey } from '../lib/dates';
import {
  CalendarEventModel,
  ChapterModel,
  ProblemModel,
  SessionModel,
  StudyPlanModel,
  TopicModel,
  UserModel,
  UserProgressModel,
} from '../models';
import { invalidateSheetCache } from '../modules/sheet/sheet.service';
import { generatePlan } from '../modules/calendar/calendar.service';
import { loadChapterFiles } from './load';

const DEMO_TZ = 'Asia/Kolkata';

export async function seedContent(chapters: ChapterSeed[]) {
  const keepChapters: Types.ObjectId[] = [];
  const keepTopics: Types.ObjectId[] = [];
  const keepProblems: Types.ObjectId[] = [];
  let globalOrder = 0;

  for (const ch of chapters) {
    const problemCount = ch.topics.reduce((n, t) => n + t.problems.length, 0);
    const chapter = await ChapterModel.findOneAndUpdate(
      { slug: ch.slug },
      {
        $set: {
          title: ch.title,
          description: ch.description,
          icon: ch.icon,
          order: ch.order,
          problemCount,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
    keepChapters.push(chapter._id);

    for (const [ti, t] of ch.topics.entries()) {
      const topic = await TopicModel.findOneAndUpdate(
        { chapterId: chapter._id, slug: t.slug },
        {
          $set: {
            title: t.title,
            description: t.description,
            difficulty: t.difficulty,
            resources: t.resources,
            order: ti + 1,
            problemCount: t.problems.length,
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
      keepTopics.push(topic._id);

      const ops = t.problems.map((p, pi) => ({
        updateOne: {
          filter: { slug: p.slug },
          update: {
            $set: {
              topicId: topic._id,
              chapterId: chapter._id,
              title: p.title,
              difficulty: p.difficulty,
              resources: p.resources,
              tags: p.tags,
              order: pi + 1,
              globalOrder: ++globalOrder,
            },
          },
          upsert: true,
        },
      }));
      await ProblemModel.bulkWrite(ops);
      const ids = await ProblemModel.find({ slug: { $in: t.problems.map((p) => p.slug) } })
        .select('_id')
        .lean();
      keepProblems.push(...ids.map((d) => d._id));
    }
  }

  // Remove content that was deleted from the data files.
  const removed = await ProblemModel.find({ _id: { $nin: keepProblems } })
    .select('_id')
    .lean();
  if (removed.length) {
    const ids = removed.map((r) => r._id);
    await Promise.all([
      ProblemModel.deleteMany({ _id: { $in: ids } }),
      UserProgressModel.deleteMany({ problemId: { $in: ids } }),
      CalendarEventModel.deleteMany({ problemId: { $in: ids } }),
    ]);
  }
  await TopicModel.deleteMany({ _id: { $nin: keepTopics } });
  await ChapterModel.deleteMany({ _id: { $nin: keepChapters } });
  invalidateSheetCache();

  return {
    chapters: keepChapters.length,
    topics: keepTopics.length,
    problems: keepProblems.length,
    removed: removed.length,
  };
}

export async function seedDemoUser() {
  const existing = await UserModel.findOne({ email: env.DEMO_EMAIL });
  if (existing) {
    await Promise.all([
      UserProgressModel.deleteMany({ userId: existing._id }),
      CalendarEventModel.deleteMany({ userId: existing._id }),
      StudyPlanModel.deleteMany({ userId: existing._id }),
      SessionModel.deleteMany({ userId: existing._id }),
      existing.deleteOne(),
    ]);
  }

  const user = await UserModel.create({
    name: 'Demo Student',
    email: env.DEMO_EMAIL,
    passwordHash: await bcrypt.hash(env.DEMO_PASSWORD, 12),
  });

  // Solve the first problems of the sheet spread across the last ~3 weeks (with a live streak).
  const problems = await ProblemModel.find().sort({ globalOrder: 1 }).limit(60).lean();
  const today = toDateKey(new Date(), DEMO_TZ);
  const solved = problems.slice(0, 34);
  const dayOffsets = [
    20, 20, 19, 18, 18, 17, 15, 15, 14, 13, 12, 12, 11, 10, 9, 9, 8, 7, 7, 6, 6, 5, 4, 4, 3, 3, 2,
    2, 1, 1, 1, 0, 0, 0,
  ];
  const solvedAtFor = (i: number) => {
    const d = new Date();
    d.setDate(d.getDate() - dayOffsets[i]!);
    d.setHours(19 + (i % 3), (i * 7) % 60, 0, 0);
    return d;
  };

  await UserProgressModel.insertMany(
    solved.map((p, i) => ({
      userId: user._id,
      problemId: p._id,
      chapterId: p.chapterId,
      difficulty: p.difficulty,
      status: 'solved',
      solvedAt: solvedAtFor(i),
      starred: i % 7 === 3,
      notes: i === 4 ? 'Use the hashmap of value → index; single pass is enough.' : '',
    })),
  );
  // A couple of attempted problems to show the in-progress state.
  await UserProgressModel.insertMany(
    problems.slice(34, 36).map((p) => ({
      userId: user._id,
      problemId: p._id,
      chapterId: p.chapterId,
      difficulty: p.difficulty,
      status: 'attempted',
      notes: 'Revisit the edge case with negative numbers.',
    })),
  );

  // Spaced-repetition revisions for every solved problem (past ones marked done / missed).
  const revisionDocs = solved.flatMap((p, i) => {
    const solvedKey = toDateKey(solvedAtFor(i), DEMO_TZ);
    return REVISION_INTERVALS_DAYS.map((days, stage) => {
      const date = addDays(solvedKey, days);
      const past = date < today;
      return {
        userId: user._id,
        problemId: p._id,
        title: `Revise: ${p.title}`,
        date,
        type: 'revision',
        source: 'spaced-repetition',
        revisionStage: stage + 1,
        status: past ? (i % 5 === 0 ? 'missed' : 'done') : 'pending',
      };
    });
  });
  await CalendarEventModel.insertMany(revisionDocs);

  // A couple of personal events and an auto plan for the next 8 weeks.
  await CalendarEventModel.insertMany([
    {
      userId: user._id,
      title: 'Weekly mock contest',
      date: addDays(today, 5),
      startTime: '20:00',
      endTime: '21:30',
      type: 'contest',
    },
    { userId: user._id, title: 'Revise all Arrays notes', date: addDays(today, 2), type: 'custom' },
  ]);
  await UserModel.updateOne(
    { _id: user._id },
    { $set: { lastActive: { problemId: problems[36]?._id, at: new Date() } } },
  );
  invalidateSheetCache();
  const plan = await generatePlan(user.id, {
    startDate: today,
    targetDate: addDays(today, 56),
    dailyGoal: 3,
    studyDays: [1, 2, 3, 4, 5, 6],
    replaceExisting: true,
  });

  return { email: env.DEMO_EMAIL, solved: solved.length, planned: plan.created };
}

async function main() {
  const chapters = loadChapterFiles();
  await connectDB();
  // Make sure all indexes declared in the schemas exist before writing.
  await Promise.all(
    [
      ChapterModel,
      TopicModel,
      ProblemModel,
      UserModel,
      UserProgressModel,
      CalendarEventModel,
      StudyPlanModel,
      SessionModel,
    ].map((m) => m.syncIndexes()),
  );
  const content = await seedContent(chapters);
  logger.info(content, '📚 Content seeded');
  const demo = await seedDemoUser();
  logger.info(demo, '👤 Demo user ready');
  await disconnectDB();
}

// Run only when executed directly (not when imported by tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(async (err) => {
    logger.fatal({ err }, 'Seed failed');
    await disconnectDB();
    process.exit(1);
  });
}

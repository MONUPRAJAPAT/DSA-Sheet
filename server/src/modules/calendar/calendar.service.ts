import { Types } from 'mongoose';
import type {
  CalendarEventDTO,
  CreateEventInput,
  GeneratePlanInput,
  PlanSummaryDTO,
  UpdateEventInput,
} from '@dsa/shared';
import { AppError } from '../../lib/errors';
import { addDays, toDateKey, weekday } from '../../lib/dates';
import {
  CalendarEventModel,
  ProblemModel,
  StudyPlanModel,
  UserModel,
  UserProgressModel,
} from '../../models';
import { getSheet } from '../sheet/sheet.service';
import { updateProgress } from '../progress/progress.service';

const MAX_PLAN_DAYS = 366;

interface PopulatedProblem {
  _id: Types.ObjectId;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  resources: { practice: { url: string } };
}

type EventLean = {
  _id: Types.ObjectId;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  type: CalendarEventDTO['type'];
  status: CalendarEventDTO['status'];
  source: CalendarEventDTO['source'];
  notes: string;
  rolledOverFrom: string | null;
  problemId: PopulatedProblem | null;
};

function toDTO(e: EventLean, today: string): CalendarEventDTO {
  const p = e.problemId;
  return {
    id: e._id.toString(),
    title: e.title,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    type: e.type,
    status: e.status,
    source: e.source,
    notes: e.notes,
    rolledOverFrom: e.rolledOverFrom,
    overdue: e.status === 'pending' && e.date < today,
    problem: p
      ? {
          id: p._id.toString(),
          title: p.title,
          difficulty: p.difficulty,
          practiceUrl: p.resources.practice.url,
        }
      : null,
  };
}

const POPULATE = { path: 'problemId', select: 'title difficulty resources.practice.url' } as const;

async function findOwned(userId: string, id: string) {
  const event = await CalendarEventModel.findOne({ _id: id, userId });
  if (!event) throw AppError.notFound('Event');
  return event;
}

async function populateOne(id: Types.ObjectId, today: string) {
  const e = await CalendarEventModel.findById(id).populate(POPULATE).lean<EventLean>();
  return toDTO(e!, today);
}

export async function listEvents(userId: string, from: string, to: string, timeZone: string) {
  const today = toDateKey(new Date(), timeZone);
  const events = await CalendarEventModel.find({ userId, date: { $gte: from, $lte: to } })
    .sort({ date: 1, startTime: 1, createdAt: 1 })
    .populate(POPULATE)
    .lean<EventLean[]>();
  return events.map((e) => toDTO(e, today));
}

/** Today's agenda + everything overdue — powers the dashboard "Today" card and revision queue. */
export async function getAgenda(userId: string, timeZone: string) {
  const today = toDateKey(new Date(), timeZone);
  const events = await CalendarEventModel.find({
    userId,
    $or: [{ date: today }, { date: { $lt: today }, status: 'pending' }],
  })
    .sort({ date: 1, startTime: 1 })
    .populate(POPULATE)
    .lean<EventLean[]>();
  const dtos = events.map((e) => toDTO(e, today));
  return {
    today,
    events: dtos.filter((e) => e.date === today),
    overdue: dtos.filter((e) => e.overdue),
  };
}

export async function createEvent(userId: string, input: CreateEventInput, timeZone: string) {
  let title = input.title;
  if (input.problemId) {
    const problem = await ProblemModel.findById(input.problemId).select('title').lean();
    if (!problem) throw AppError.notFound('Problem');
    title ??= input.type === 'revision' ? `Revise: ${problem.title}` : problem.title;
  }
  if (!title) throw AppError.badRequest('A title or problemId is required');
  const event = await CalendarEventModel.create({ ...input, title, userId, source: 'manual' });
  return populateOne(event._id, toDateKey(new Date(), timeZone));
}

export async function updateEvent(
  userId: string,
  id: string,
  input: UpdateEventInput,
  timeZone: string,
) {
  const event = await findOwned(userId, id);
  const completingStudy =
    input.status === 'done' && event.status !== 'done' && event.type === 'study';
  event.set(input);
  await event.save();
  // Completing a study task for a problem ticks the problem on the sheet too (and schedules revisions).
  if (completingStudy && event.problemId) {
    await updateProgress(userId, event.problemId.toString(), { status: 'solved' }, timeZone);
  }
  return populateOne(event._id, toDateKey(new Date(), timeZone));
}

export async function deleteEvent(userId: string, id: string) {
  const event = await findOwned(userId, id);
  await event.deleteOne();
}

/** Moves every overdue pending task to today, keeping the original marked as "missed" for history. */
export async function rolloverOverdue(userId: string, timeZone: string) {
  const today = toDateKey(new Date(), timeZone);
  const overdue = await CalendarEventModel.find({
    userId,
    status: 'pending',
    date: { $lt: today },
  }).lean();
  if (overdue.length === 0) return { moved: 0 };
  await CalendarEventModel.insertMany(
    overdue.map(({ _id, createdAt: _createdAt, updatedAt: _updatedAt, ...e }) => ({
      ...e,
      date: today,
      status: 'pending',
      rolledOverFrom: e.rolledOverFrom ?? e.date,
    })),
  );
  await CalendarEventModel.updateMany(
    { _id: { $in: overdue.map((e) => e._id) } },
    { $set: { status: 'missed' } },
  );
  return { moved: overdue.length };
}

export async function getPlan(userId: string) {
  return StudyPlanModel.findOne({ userId }).lean();
}

/**
 * Auto-plan: spreads the student's *unsolved* problems (in sheet order, which already goes
 * easy → hard inside each topic) across their chosen study days between start and target date.
 */
export async function generatePlan(
  userId: string,
  input: GeneratePlanInput,
): Promise<PlanSummaryDTO> {
  const uid = new Types.ObjectId(userId);

  if (input.replaceExisting) {
    await CalendarEventModel.deleteMany({
      userId: uid,
      source: 'auto-plan',
      status: 'pending',
      date: { $gte: input.startDate },
    });
  }

  const [{ sheet }, solvedRows, alreadyPlanned] = await Promise.all([
    getSheet(),
    UserProgressModel.find({ userId: uid, status: 'solved' }).select('problemId').lean(),
    CalendarEventModel.find({
      userId: uid,
      type: 'study',
      status: 'pending',
      problemId: { $ne: null },
    })
      .select('problemId')
      .lean(),
  ]);
  const skip = new Set([...solvedRows, ...alreadyPlanned].map((r) => r.problemId!.toString()));
  const chapterFilter = input.chapterIds?.length ? new Set(input.chapterIds) : null;

  const candidates = sheet.chapters
    .filter((c) => !chapterFilter || chapterFilter.has(c.id))
    .flatMap((c) => c.topics.flatMap((t) => t.problems))
    .filter((p) => !skip.has(p.id));

  const studyDays = new Set(input.studyDays);
  const slots: string[] = [];
  for (
    let d = input.startDate, i = 0;
    d <= input.targetDate && i < MAX_PLAN_DAYS;
    d = addDays(d, 1), i++
  ) {
    if (studyDays.has(weekday(d))) slots.push(d);
  }

  const docs: Record<string, unknown>[] = [];
  let cursor = 0;
  for (const date of slots) {
    for (let k = 0; k < input.dailyGoal && cursor < candidates.length; k++, cursor++) {
      const p = candidates[cursor]!;
      docs.push({
        userId: uid,
        problemId: p.id,
        title: p.title,
        date,
        type: 'study',
        source: 'auto-plan',
      });
    }
    if (cursor >= candidates.length) break;
  }
  if (docs.length) await CalendarEventModel.insertMany(docs);

  await Promise.all([
    StudyPlanModel.findOneAndUpdate(
      { userId: uid },
      {
        $set: {
          startDate: input.startDate,
          targetDate: input.targetDate,
          dailyGoal: input.dailyGoal,
          studyDays: input.studyDays,
          chapterIds: input.chapterIds ?? [],
          problemsScheduled: docs.length,
        },
      },
      { upsert: true },
    ),
    UserModel.updateOne(
      { _id: uid },
      {
        $set: {
          'preferences.dailyGoal': input.dailyGoal,
          'preferences.studyDays': input.studyDays,
          'preferences.targetDate': input.targetDate,
        },
      },
    ),
  ]);

  const unscheduled = candidates.length - docs.length;
  return {
    created: docs.length,
    problemsScheduled: docs.length,
    firstDate: (docs[0]?.date as string) ?? null,
    lastDate: (docs.at(-1)?.date as string) ?? null,
    fitsBeforeTarget: unscheduled === 0,
    unscheduled,
    suggestedDailyGoal: slots.length
      ? Math.max(1, Math.ceil(candidates.length / slots.length))
      : candidates.length,
  };
}

export async function deletePlan(userId: string) {
  await Promise.all([
    StudyPlanModel.deleteOne({ userId }),
    CalendarEventModel.deleteMany({ userId, source: 'auto-plan', status: 'pending' }),
  ]);
}

/** RFC 5545 iCalendar export so students can subscribe in Google/Apple Calendar. */
export async function exportIcs(userId: string): Promise<string> {
  const events = await CalendarEventModel.find({ userId, status: { $ne: 'missed' } })
    .sort({ date: 1 })
    .lean();
  const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DSA Sheet//Study Plan//EN',
    'CALSCALE:GREGORIAN',
  ];
  for (const e of events) {
    const day = e.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${e._id}@dsa-sheet`, `DTSTAMP:${stamp}`);
    if (e.startTime) {
      lines.push(`DTSTART:${day}T${e.startTime.replace(':', '')}00`);
      lines.push(`DTEND:${day}T${(e.endTime ?? e.startTime).replace(':', '')}00`);
    } else {
      lines.push(
        `DTSTART;VALUE=DATE:${day}`,
        `DTEND;VALUE=DATE:${addDays(e.date, 1).replace(/-/g, '')}`,
      );
    }
    lines.push(`SUMMARY:${esc(e.title)}`, `CATEGORIES:${e.type.toUpperCase()}`);
    if (e.notes) lines.push(`DESCRIPTION:${esc(e.notes)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

import { z } from 'zod';
import {
  DIFFICULTIES,
  EVENT_STATUSES,
  EVENT_TYPES,
  PLATFORMS,
  PROGRESS_STATUSES,
} from './constants';

/** YYYY-MM-DD calendar date (timezone-free, the user's local day). */
export const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date as YYYY-MM-DD');
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

// ---------- Auth ----------
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(60),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  password,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---------- User preferences ----------
export const updatePreferencesSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  dailyGoal: z.number().int().min(1).max(20).optional(),
  studyDays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  targetDate: dateKey.nullable().optional(),
});
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

// ---------- Content (used by seed + admin) ----------
export const resourcesSchema = z.object({
  youtube: z.url(),
  practice: z.object({ platform: z.enum(PLATFORMS), url: z.url() }),
  article: z.url(),
});

export const problemSeedSchema = z.object({
  title: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  difficulty: z.enum(DIFFICULTIES),
  resources: resourcesSchema,
  tags: z.array(z.string()).default([]),
});

export const topicSeedSchema = z.object({
  title: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  difficulty: z.enum(DIFFICULTIES),
  description: z.string().default(''),
  resources: resourcesSchema,
  problems: z.array(problemSeedSchema).min(1),
});

export const chapterSeedSchema = z.object({
  title: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int().min(1),
  description: z.string(),
  icon: z.string(),
  topics: z.array(topicSeedSchema).min(1),
});
export type ChapterSeed = z.infer<typeof chapterSeedSchema>;

// ---------- Progress ----------
export const updateProgressSchema = z
  .object({
    status: z.enum(PROGRESS_STATUSES).optional(),
    starred: z.boolean().optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field');
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;

export const lastActiveSchema = z.object({ problemId: objectId });

// ---------- Calendar ----------
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm');

export const createEventSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  problemId: objectId.optional(),
  date: dateKey,
  startTime: time.optional(),
  endTime: time.optional(),
  type: z.enum(EVENT_TYPES).default('study'),
  notes: z.string().max(1000).optional(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    date: dateKey.optional(),
    startTime: time.nullable().optional(),
    endTime: time.nullable().optional(),
    type: z.enum(EVENT_TYPES).optional(),
    status: z.enum(EVENT_STATUSES).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field');
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const eventRangeQuerySchema = z
  .object({ from: dateKey, to: dateKey })
  .refine((v) => v.from <= v.to, '`from` must be before `to`');

export const generatePlanSchema = z
  .object({
    startDate: dateKey,
    targetDate: dateKey,
    dailyGoal: z.number().int().min(1).max(20),
    studyDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    chapterIds: z.array(objectId).optional(),
    replaceExisting: z.boolean().default(true),
  })
  .refine((v) => v.startDate <= v.targetDate, 'Target date must be after start date');
export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;

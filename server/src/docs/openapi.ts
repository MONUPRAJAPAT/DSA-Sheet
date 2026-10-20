import { z, type ZodType } from 'zod';
import {
  createEventSchema,
  generatePlanSchema,
  lastActiveSchema,
  loginSchema,
  registerSchema,
  updateEventSchema,
  updatePreferencesSchema,
  updateProgressSchema,
} from '@dsa/shared';

/** Request schemas are generated from the same Zod schemas the API validates with — docs can't drift. */
const json = (schema: ZodType) => ({
  required: true,
  content: {
    'application/json': { schema: z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) },
  },
});

const ok = (description: string) => ({ description });
const secured = [{ bearerAuth: [] }];
const idParam = (name: string) => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string' },
});
const errors = {
  400: ok('Validation error'),
  401: ok('Missing / expired access token'),
  404: ok('Not found'),
};

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'DSA Sheet API',
    version: '1.0.0',
    description:
      'REST API for the DSA Sheet app. All responses use the envelope `{ success, data }` or `{ success: false, error: { code, message, details } }`. ' +
      'Send `X-Timezone: <IANA zone>` so day-based features (streaks, calendar, revisions) use the student’s local day.',
  },
  servers: [{ url: '/api/v1' }],
  tags: [
    { name: 'Auth' },
    { name: 'Sheet' },
    { name: 'Progress' },
    { name: 'Calendar' },
    { name: 'Users' },
    { name: 'Health' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account (sets refresh cookie)',
        requestBody: json(registerSchema),
        responses: { 201: ok('User + access token'), 409: ok('Email taken'), ...errors },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in (sets refresh cookie)',
        requestBody: json(loginSchema),
        responses: { 200: ok('User + access token'), 401: ok('Invalid credentials') },
      },
    },
    '/auth/demo': {
      post: {
        tags: ['Auth'],
        summary: 'Log in as the demo student',
        responses: { 200: ok('User + access token') },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh cookie and get a new access token',
        responses: { 200: ok('User + access token'), 401: ok('No / expired session') },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke this device session',
        responses: { 200: ok('Logged out') },
      },
    },
    '/auth/logout-all': {
      post: {
        tags: ['Auth'],
        security: secured,
        summary: 'Revoke all sessions of the user',
        responses: { 200: ok('Logged out everywhere') },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        security: secured,
        summary: 'Current user',
        responses: { 200: ok('User'), ...errors },
      },
    },

    '/sheet': {
      get: {
        tags: ['Sheet'],
        summary: 'Full sheet: chapters → topics → problems (public, ETag-cached)',
        responses: { 200: ok('Sheet'), 304: ok('Not modified') },
      },
    },

    '/progress': {
      get: {
        tags: ['Progress'],
        security: secured,
        summary: "All of the user's progress rows",
        responses: { 200: ok('Progress[]'), ...errors },
      },
      delete: {
        tags: ['Progress'],
        security: secured,
        summary: 'Reset all progress',
        responses: { 200: ok('Reset') },
      },
    },
    '/progress/{problemId}': {
      put: {
        tags: ['Progress'],
        security: secured,
        summary: 'Idempotent upsert of status / star / notes',
        parameters: [idParam('problemId')],
        requestBody: json(updateProgressSchema),
        responses: { 200: ok('Progress'), ...errors },
      },
    },
    '/progress/stats': {
      get: {
        tags: ['Progress'],
        security: secured,
        summary: 'Dashboard stats, streak and "continue where you left off"',
        responses: { 200: ok('Stats') },
      },
    },
    '/progress/heatmap': {
      get: {
        tags: ['Progress'],
        security: secured,
        summary: 'Solved-per-day for the last 365 days',
        responses: { 200: ok('HeatmapDay[]') },
      },
    },
    '/progress/last-active': {
      post: {
        tags: ['Progress'],
        security: secured,
        summary: 'Remember the last opened problem',
        requestBody: json(lastActiveSchema),
        responses: { 200: ok('Saved') },
      },
    },

    '/calendar/events': {
      get: {
        tags: ['Calendar'],
        security: secured,
        summary: 'Events in a date range',
        parameters: [
          { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: ok('CalendarEvent[]'), ...errors },
      },
      post: {
        tags: ['Calendar'],
        security: secured,
        summary: 'Create an event (optionally linked to a problem)',
        requestBody: json(createEventSchema),
        responses: { 201: ok('CalendarEvent'), ...errors },
      },
    },
    '/calendar/events/{id}': {
      patch: {
        tags: ['Calendar'],
        security: secured,
        summary: 'Update / reschedule / complete an event',
        parameters: [idParam('id')],
        requestBody: json(updateEventSchema),
        responses: { 200: ok('CalendarEvent'), ...errors },
      },
      delete: {
        tags: ['Calendar'],
        security: secured,
        summary: 'Delete an event',
        parameters: [idParam('id')],
        responses: { 200: ok('Deleted'), ...errors },
      },
    },
    '/calendar/agenda': {
      get: {
        tags: ['Calendar'],
        security: secured,
        summary: "Today's tasks + overdue tasks",
        responses: { 200: ok('Agenda') },
      },
    },
    '/calendar/rollover': {
      post: {
        tags: ['Calendar'],
        security: secured,
        summary: 'Move overdue tasks to today (originals marked missed)',
        responses: { 200: ok('{ moved }') },
      },
    },
    '/calendar/plan': {
      get: {
        tags: ['Calendar'],
        security: secured,
        summary: 'Current auto study plan settings',
        responses: { 200: ok('StudyPlan'), 404: ok('No plan') },
      },
      post: {
        tags: ['Calendar'],
        security: secured,
        summary: 'Generate an auto study plan',
        requestBody: json(generatePlanSchema),
        responses: { 201: ok('PlanSummary'), ...errors },
      },
      delete: {
        tags: ['Calendar'],
        security: secured,
        summary: 'Remove plan and its pending tasks',
        responses: { 200: ok('Deleted') },
      },
    },
    '/calendar/export.ics': {
      get: {
        tags: ['Calendar'],
        security: secured,
        summary: 'Download the schedule as iCalendar',
        responses: { 200: ok('text/calendar') },
      },
    },

    '/users/me': {
      patch: {
        tags: ['Users'],
        security: secured,
        summary: 'Update name and study preferences',
        requestBody: json(updatePreferencesSchema),
        responses: { 200: ok('User'), ...errors },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness + DB connectivity',
        responses: { 200: ok('Healthy'), 503: ok('DB down') },
      },
    },
  },
};

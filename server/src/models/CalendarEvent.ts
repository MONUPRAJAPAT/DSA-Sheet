import { Schema, model, type InferSchemaType } from 'mongoose';
import { EVENT_SOURCES, EVENT_STATUSES, EVENT_TYPES } from '@dsa/shared';

const calendarEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'Problem', default: null },
    title: { type: String, required: true, maxlength: 120 },
    /** User-local day, YYYY-MM-DD. */
    date: { type: String, required: true },
    startTime: { type: String, default: null }, // HH:mm, null = all-day
    endTime: { type: String, default: null },
    type: { type: String, enum: EVENT_TYPES, default: 'study' },
    status: { type: String, enum: EVENT_STATUSES, default: 'pending' },
    source: { type: String, enum: EVENT_SOURCES, default: 'manual' },
    /** Spaced-repetition stage (1..4) for revision events. */
    revisionStage: { type: Number, default: null },
    notes: { type: String, default: '', maxlength: 1000 },
    rolledOverFrom: { type: String, default: null },
  },
  { timestamps: true },
);

// Month/week view: all events of a user in a date range.
calendarEventSchema.index({ userId: 1, date: 1 });
// Revision queue & syncing events when a problem is ticked.
calendarEventSchema.index({ userId: 1, problemId: 1, status: 1 });

export type CalendarEvent = InferSchemaType<typeof calendarEventSchema>;
export const CalendarEventModel = model('CalendarEvent', calendarEventSchema, 'calendarEvents');

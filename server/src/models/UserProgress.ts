import { Schema, model, type InferSchemaType } from 'mongoose';
import { DIFFICULTIES, PROGRESS_STATUSES } from '@dsa/shared';

/**
 * One document per (user, problem) the student has interacted with.
 * A missing document means "todo" — so a new user costs zero rows.
 */
const userProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true },
    // Denormalized from Problem so dashboard aggregations never need a $lookup.
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    status: { type: String, enum: PROGRESS_STATUSES, default: 'todo' },
    starred: { type: Boolean, default: false },
    notes: { type: String, default: '', maxlength: 2000 },
    solvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Idempotent upsert target + "load my progress" query.
userProgressSchema.index({ userId: 1, problemId: 1 }, { unique: true });
// Heatmap / streak: solved problems of a user ordered by time.
userProgressSchema.index(
  { userId: 1, solvedAt: -1 },
  { partialFilterExpression: { status: 'solved' } },
);

export type UserProgress = InferSchemaType<typeof userProgressSchema>;
export const UserProgressModel = model('UserProgress', userProgressSchema, 'userProgress');

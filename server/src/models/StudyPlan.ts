import { Schema, model, type InferSchemaType } from 'mongoose';

/** The settings a student chose in the auto-plan wizard (one active plan per user). */
const studyPlanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: String, required: true },
    targetDate: { type: String, required: true },
    dailyGoal: { type: Number, required: true },
    studyDays: { type: [Number], required: true },
    chapterIds: { type: [Schema.Types.ObjectId], ref: 'Chapter', default: [] },
    problemsScheduled: { type: Number, default: 0 },
  },
  { timestamps: true },
);

studyPlanSchema.index({ userId: 1 }, { unique: true });

export type StudyPlan = InferSchemaType<typeof studyPlanSchema>;
export const StudyPlanModel = model('StudyPlan', studyPlanSchema, 'studyPlans');

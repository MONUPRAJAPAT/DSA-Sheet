import { Schema, model, type InferSchemaType } from 'mongoose';
import { DIFFICULTIES } from '@dsa/shared';
import { resourcesSchema } from './resources';

const problemSchema = new Schema(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    /** Denormalized so progress can be grouped by chapter without a join. */
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    resources: { type: resourcesSchema, required: true },
    tags: { type: [String], default: [] },
    /** Position within its topic. */
    order: { type: Number, required: true },
    /** Position in the whole sheet — used for "next problem" and the auto study plan. */
    globalOrder: { type: Number, required: true },
  },
  { timestamps: true },
);

problemSchema.index({ slug: 1 }, { unique: true });
problemSchema.index({ topicId: 1, order: 1 });
problemSchema.index({ globalOrder: 1 });

export type Problem = InferSchemaType<typeof problemSchema>;
export const ProblemModel = model('Problem', problemSchema);

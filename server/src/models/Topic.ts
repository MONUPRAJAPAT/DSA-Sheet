import { Schema, model, type InferSchemaType } from 'mongoose';
import { DIFFICULTIES } from '@dsa/shared';
import { resourcesSchema } from './resources';

const topicSchema = new Schema(
  {
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: '' },
    difficulty: { type: String, enum: DIFFICULTIES, required: true }, // PDF §5: topics are tagged too
    resources: { type: resourcesSchema, required: true }, // PDF §4: topic-level resources
    order: { type: Number, required: true },
    problemCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

topicSchema.index({ chapterId: 1, order: 1 });
topicSchema.index({ chapterId: 1, slug: 1 }, { unique: true });

export type Topic = InferSchemaType<typeof topicSchema>;
export const TopicModel = model('Topic', topicSchema);

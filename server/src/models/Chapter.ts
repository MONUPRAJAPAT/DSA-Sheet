import { Schema, model, type InferSchemaType } from 'mongoose';

const chapterSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'book' },
    order: { type: Number, required: true },
    problemCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

chapterSchema.index({ slug: 1 }, { unique: true });
chapterSchema.index({ order: 1 });

export type Chapter = InferSchemaType<typeof chapterSchema>;
export const ChapterModel = model('Chapter', chapterSchema);

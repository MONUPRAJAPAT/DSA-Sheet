import { Schema } from 'mongoose';
import { PLATFORMS } from '@dsa/shared';

const practiceSchema = new Schema(
  {
    platform: { type: String, enum: PLATFORMS, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

/** Learning resources — required on every topic and every problem (PDF §4). */
export const resourcesSchema = new Schema(
  {
    youtube: { type: String, required: true },
    practice: { type: practiceSchema, required: true },
    article: { type: String, required: true },
  },
  { _id: false },
);

import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * One document per logged-in device. Only a SHA-256 hash of the refresh token is stored,
 * so a database leak does not leak usable tokens. Expired sessions are removed by a TTL index.
 */
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type Session = InferSchemaType<typeof sessionSchema>;
export const SessionModel = model('Session', sessionSchema);

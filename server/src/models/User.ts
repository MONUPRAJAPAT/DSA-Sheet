import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    preferences: {
      dailyGoal: { type: Number, default: 3, min: 1, max: 20 },
      studyDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] }, // Mon–Sat
      targetDate: { type: String, default: null }, // YYYY-MM-DD
    },
    /** Drives "resume exactly where you left off". */
    lastActive: {
      problemId: { type: Schema.Types.ObjectId, ref: 'Problem', default: null },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });

export type User = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<User>;
export const UserModel = model('User', userSchema);

import * as mongoose from 'mongoose';

export const ResumeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    currentVersionId: { type: String, default: null },
    latestVersionNumber: { type: Number, required: true, default: 0, min: 0},
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

export interface Resume extends mongoose.Document {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly currentVersionId?: string | null;
  readonly latestVersionNumber: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date | null;
}

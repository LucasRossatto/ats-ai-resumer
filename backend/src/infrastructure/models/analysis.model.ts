import * as mongoose from 'mongoose';
import type {
  BulletRewrite,
  Issue,
  ScoreBreakdown,
  Strength,
} from '@domain/entities/Analysis';

const issueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    explanation: String,
    fix: String,
  },
  { _id: false },
);

const strengthSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    evidence: String,
  },
  { _id: false },
);

const bulletRewriteSchema = new mongoose.Schema({
  section: String,
  original: { type: String, required: true },
  rewritten: { type: String, required: true },
  rationale: String,
});

const scoreBreakdownSchema = new mongoose.Schema(
  {
    keywords: { type: Number, min: 0, max: 25 },
    formatting: { type: Number, min: 0, max: 25 },
    impact: { type: Number, min: 0, max: 35 },
    clarity: { type: Number, min: 0, max: 25 },
  },
  { _id: false },
);

export const AnalysisSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, ref: 'Auth', required: true, index: true },
    resumeId: { type: String, ref: 'Resume', required: true, index: true },
    versionId: {
      type: String,
      ref: 'ResumeVersion',
      required: true,
      index: true,
    },
    atsScore: { type: Number, required: true, min: 0, max: 100 },
    scoreBreakdown: scoreBreakdownSchema,
    issues: [issueSchema],
    strengths: [strengthSchema],
    bulletRewrites: [bulletRewriteSchema],
    keywordsPresent: [String],
    keywordsMissing: [String],
    summary: String,
    model: { type: String, required: true },
    promptTokens: Number,
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

AnalysisSchema.index({ versionId: 1, createdAt: -1 });

/**
 * `model` (the LLM that produced the analysis) collides with Document.model,
 * so the document type omits it instead of extending Document directly.
 */
export type Analysis = Omit<mongoose.Document, 'model'> & {
  readonly id: string;
  readonly userId: string;
  readonly resumeId: string;
  readonly versionId: string;
  readonly atsScore: number;
  readonly scoreBreakdown?: ScoreBreakdown;
  readonly issues?: Issue[];
  readonly strengths?: Strength[];
  readonly bulletRewrites?: BulletRewrite[];
  readonly keywordsPresent?: string[];
  readonly keywordsMissing?: string[];
  readonly summary?: string;
  readonly model: string;
  readonly promptTokens?: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date | null;
};

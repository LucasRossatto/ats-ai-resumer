import * as mongoose from 'mongoose';

const linkSchema = new mongoose.Schema(
  {
    label: String,
    url: String,
  },
  { _id: false },
);

const basicsSchema = new mongoose.Schema(
  {
    name: String,
    title: String,
    location: String,
    email: String,
    phone: String,
    links: [linkSchema],
  },
  { _id: false },
);

const experienceItemSchema = new mongoose.Schema(
  {
    company: String,
    role: String,
    location: String,
    period: String,
    bullets: [String],
  },
  { _id: false },
);

const educationItemSchema = new mongoose.Schema(
  {
    degree: String,
    school: String,
    location: String,
    period: String,
    details: String,
  },
  { _id: false },
);

const projectItemSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    tech: [String],
    links: [linkSchema],
  },
  { _id: false },
);

const certificationItemSchema = new mongoose.Schema(
  {
    name: String,
    issuer: String,
    year: String,
  },
  { _id: false },
);

const parsedSectionsSchema = new mongoose.Schema(
  {
    basics: basicsSchema,
    summary: String,
    experience: [experienceItemSchema],
    education: [educationItemSchema],
    projects: [projectItemSchema],
    skills: [String],
    certifications: [certificationItemSchema],
    languages: [String],
    interests: [String],
  },
  { _id: false },
);

export const ResumeVersionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index:true },
    resumeId: { type: String, required: true, index: true },
    versionNumber: { type: Number, required: true, min: 1 },
    label: { type: String, required: true, trim: true },
    rawText: { type: String, required: true },
    parsedSections: parsedSectionsSchema,
    sourceType: {
      type: String,
      required: true,
      enum: ['upload', 'rewrite'],
    },
    parentVersionId: { type: String, default: null },
    latestAnalysisId: { type: String, default: null },
  },
  {
    timestamps: true,
  },
);

ResumeVersionSchema.index({ resumeId: 1, versionNumber: 1 }, { unique: true });

export interface Link {
  readonly label?: string;
  readonly url?: string;
}

export interface Basics {
  readonly name?: string;
  readonly title?: string;
  readonly location?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly links?: Link[];
}

export interface ExperienceItem {
  readonly company?: string;
  readonly role?: string;
  readonly location?: string;
  readonly period?: string;
  readonly bullets?: string[];
}

export interface EducationItem {
  readonly degree?: string;
  readonly school?: string;
  readonly location?: string;
  readonly period?: string;
  readonly details?: string;
}

export interface ProjectItem {
  readonly name?: string;
  readonly description?: string;
  readonly tech?: string[];
  readonly links?: Link[];
}

export interface CertificationItem {
  readonly name?: string;
  readonly issuer?: string;
  readonly year?: string;
}

export interface ParsedSections {
  readonly basics?: Basics;
  readonly summary?: string;
  readonly experience?: ExperienceItem[];
  readonly education?: EducationItem[];
  readonly projects?: ProjectItem[];
  readonly skills?: string[];
  readonly certifications?: CertificationItem[];
  readonly languages?: string[];
  readonly interests?: string[];
}

export type ResumeVersionSourceType = 'upload' | 'rewrite';

export interface ResumeVersion extends mongoose.Document {
  readonly id: string;
  readonly resumeId: string;
  readonly versionNumber: number;
  readonly label: string;
  readonly rawText: string;
  readonly parsedSections?: ParsedSections;
  readonly sourceType: ResumeVersionSourceType;
  readonly parentVersionId?: string | null;
  readonly latestAnalysisId?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

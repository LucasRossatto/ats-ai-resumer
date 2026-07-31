export interface Link {
  label?: string;
  url?: string;
}

export interface Basics {
  name?: string;
  title?: string;
  location?: string;
  email?: string;
  phone?: string;
  links?: Link[];
}

export interface ExperienceItem {
  company?: string;
  role?: string;
  location?: string;
  period?: string;
  bullets?: string[];
}

export interface EducationItem {
  degree?: string;
  school?: string;
  location?: string;
  period?: string;
  details?: string;
}

export interface ProjectItem {
  name?: string;
  description?: string;
  tech?: string[];
  links?: Link[];
}

export interface CertificationItem {
  name?: string;
  issuer?: string;
  year?: string;
}

export interface ParsedSections {
  basics?: Basics;
  summary?: string;
  experience?: ExperienceItem[];
  education?: EducationItem[];
  projects?: ProjectItem[];
  skills?: string[];
  certifications?: CertificationItem[];
  languages?: string[];
  interests?: string[];
}

export type ResumeVersionSourceType = 'upload' | 'rewrite';

export class ResumeVersion {
  readonly id: string;
  readonly resumeId: string;
  versionNumber: number;
  label: string;
  rawText?: string;
  parsedSections?: ParsedSections;
  sourceType: ResumeVersionSourceType;
  parentVersionId?: string | null;
  latestAnalysisId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

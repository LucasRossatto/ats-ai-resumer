export type IssueSeverity = 'low' | 'medium' | 'high';

export interface Issue {
  title: string;
  severity?: IssueSeverity;
  explanation?: string;
  fix?: string;
}

export interface Strength {
  title: string;
  evidence?: string;
}

export interface BulletRewrite {
  id?: string;
  section?: string;
  original: string;
  rewritten: string;
  rationale?: string;
}

export interface ScoreBreakdown {
  keywords?: number;
  formatting?: number;
  impact?: number;
  clarity?: number;
}

/**
 * Read model of an analysis for the dashboard: the score plus the sizes of the
 * lists it charts. The lists themselves stay out, a history of ten analyses
 * would otherwise carry every keyword and rewrite with it.
 */
export interface AnalysisStat {
  id: string;
  resumeId: string;
  versionId: string;
  atsScore: number;
  issuesCount: number;
  keywordsPresentCount: number;
  keywordsMissingCount: number;
  createdAt?: Date;
}

export class Analysis {
  readonly id: string;
  readonly userId: string;
  readonly resumeId: string;
  readonly versionId: string;
  atsScore: number;
  scoreBreakdown?: ScoreBreakdown;
  issues?: Issue[];
  strengths?: Strength[];
  bulletRewrites?: BulletRewrite[];
  keywordsPresent?: string[];
  keywordsMissing?: string[];
  summary?: string;
  model: string;
  promptTokens?: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

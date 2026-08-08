import { IssueSeverity } from '@domain/entities/Analysis';

export interface InsightResumeRef {
  id: string;
  title: string;
  latestVersionNumber: number;
}

/**
 * A point of the score-over-time chart. `at` rather than `createdAt`: this is an
 * event on a timeline, not the creation stamp of a record.
 */
export interface ScoreTrendPoint {
  score: number;
  resumeId: string;
  resumeTitle: string;
  at?: Date;
}

export interface BestScore {
  value: number;
  resumeId: string;
  resumeTitle: string;
  createdAt?: Date;
}

export interface IssueFrequency {
  title: string;
  count: number;
  severity: IssueSeverity;
}

export interface KeywordFrequency {
  keyword: string;
  count: number;
}

export interface ResumePerformance {
  resumeId: string;
  title: string;
  analysesCount: number;
  latestScore: number;
  bestScore: number;
  /**
   * Move from the first analysis of the resume to the latest one, which is the
   * whole point of iterating on it.
   */
  improvement: number;
}

/**
 * `empty` tells the UI to show the onboarding panel instead of the charts. The
 * shape does not change with it: the lists come back empty and the scores null,
 * so the page never has to branch on which fields exist.
 */
export interface InsightsOverview {
  empty: boolean;
  totalAnalyses: number;
  averageScore: number | null;
  bestScore: BestScore | null;
  resumes: InsightResumeRef[];
  scoreTrend: ScoreTrendPoint[];
  topIssues: IssueFrequency[];
  topMissingKeywords: KeywordFrequency[];
  topPresentKeywords: KeywordFrequency[];
  resumePerformance: ResumePerformance[];
}

import { Analysis, AnalysisStat } from '@domain/entities/Analysis';

export interface IAnalysisRepository {
  create(analysis: Partial<Analysis>): Promise<Analysis>;
  findByIdAndUserId(id: string, userId: string): Promise<Analysis | null>;
  /**
   * Scoped lookup used by resume-owned routes: ownership is already settled by
   * the resume, so the analysis only has to belong to it.
   */
  findByIdAndResumeId(id: string, resumeId: string): Promise<Analysis | null>;
  /**
   * Most recent analysis of a version, used to show the current score without
   * re-running the model.
   */
  findLatestByVersionId(versionId: string): Promise<Analysis | null>;
  findByResumeId(resumeId: string): Promise<Analysis[]>;
  /**
   * Lifetime number of analyses of a user, for the dashboard totals.
   */
  countByUserId(userId: string): Promise<number>;
  /**
   * Recent analysis history of a user, newest first and capped: the dashboard
   * charts a short trend, never the whole history.
   */
  findStatsByUserId(userId: string, limit: number): Promise<AnalysisStat[]>;
  /**
   * Stats of specific analyses, used to score a list of versions in one query
   * instead of one lookup per version.
   */
  findStatsByIds(ids: string[]): Promise<AnalysisStat[]>;
  /**
   * Cascade of the resume soft delete: analyses follow the resume so a restore
   * brings the history back with it.
   */
  deleteByResumeId(resumeId: string): Promise<void>;
}

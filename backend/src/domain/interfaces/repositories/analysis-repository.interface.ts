import { Analysis } from '@domain/entities/Analysis';

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
   * Cascade of the resume soft delete: analyses follow the resume so a restore
   * brings the history back with it.
   */
  deleteByResumeId(resumeId: string): Promise<void>;
}

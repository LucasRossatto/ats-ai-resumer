import {
  ResumeVersion,
  ResumeVersionSourceType,
} from '@domain/entities/ResumeVersion';

export interface IResumeVersionRepository {
  create(version: Partial<ResumeVersion>): Promise<ResumeVersion>;
  /**
   * Listing is used for version pickers, where rawText would bloat the payload.
   */
  findByResumeId(resumeId: string): Promise<ResumeVersion[]>;
  findByIdAndResumeId(
    id: string,
    resumeId: string,
  ): Promise<ResumeVersion | null>;
  /**
   * How many versions of a kind a set of resumes produced, for the dashboard
   * totals. Counting rewrites this way keeps the whole answer in one query.
   */
  countByResumeIdsAndSourceType(
    resumeIds: string[],
    sourceType: ResumeVersionSourceType,
  ): Promise<number>;
  /**
   * Latest versions across several resumes, newest first, for the activity
   * feed.
   */
  findRecentByResumeIds(
    resumeIds: string[],
    limit: number,
  ): Promise<ResumeVersion[]>;
  update(
    id: string,
    versionData: Partial<ResumeVersion>,
  ): Promise<ResumeVersion>;
}

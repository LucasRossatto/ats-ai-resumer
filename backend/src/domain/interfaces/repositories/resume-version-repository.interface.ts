import { ResumeVersion } from '@domain/entities/ResumeVersion';

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
  update(
    id: string,
    versionData: Partial<ResumeVersion>,
  ): Promise<ResumeVersion>;
}

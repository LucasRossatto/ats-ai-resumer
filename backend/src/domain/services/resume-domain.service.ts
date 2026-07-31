import { v4 as uuidv4 } from 'uuid';
import { Resume } from '@domain/entities/Resume';
import {
  ParsedSections,
  ResumeVersion,
} from '@domain/entities/ResumeVersion';

const MAX_TITLE_LENGTH = 120;
const FALLBACK_TITLE = 'Untitled Resume';
const FIRST_VERSION_NUMBER = 1;

export class ResumeDomainService {
  /**
   * Business Logic: Generate resume ID
   */
  generateResumeId(): string {
    return 'resume-' + uuidv4();
  }

  /**
   * Business Logic: Generate resume version ID
   */
  generateVersionId(): string {
    return 'version-' + uuidv4();
  }

  /**
   * Business Logic: Resolve the resume title, falling back to the uploaded
   * file name and then to a generic label. The result always fits the 120
   * character limit the persistence layer enforces.
   */
  resolveTitle(providedTitle: string | undefined, fileName: string): string {
    const fromInput = (providedTitle || '').trim();
    const fromFile = (fileName || '').replace(/\.pdf$/i, '').trim();
    const title = fromInput || fromFile || FALLBACK_TITLE;

    return title.slice(0, MAX_TITLE_LENGTH);
  }

  /**
   * Business Logic: Build the label shown for a version number
   */
  buildVersionLabel(versionNumber: number): string {
    return `V${versionNumber}`;
  }

  /**
   * Business Logic: Assemble the resume created by the first upload
   */
  createResumeEntity(userId: string, title: string): Partial<Resume> {
    return {
      id: this.generateResumeId(),
      userId,
      title,
      currentVersionId: null,
      latestVersionNumber: FIRST_VERSION_NUMBER,
    };
  }

  /**
   * Business Logic: Assemble V1, the version an upload always produces
   */
  createFirstVersionEntity(
    resumeId: string,
    rawText: string,
    parsedSections: ParsedSections,
  ): Partial<ResumeVersion> {
    return {
      id: this.generateVersionId(),
      resumeId,
      versionNumber: FIRST_VERSION_NUMBER,
      label: this.buildVersionLabel(FIRST_VERSION_NUMBER),
      rawText,
      parsedSections,
      sourceType: 'upload',
      parentVersionId: null,
      latestAnalysisId: null,
    };
  }
}

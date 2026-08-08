import { ResumeVersionSourceType } from '@domain/entities/ResumeVersion';

/**
 * A version as the cross-resume list draws it: enough to render the card and
 * link back to its resume, never the text of the resume itself.
 */
export interface VersionListItem {
  id: string;
  label: string;
  versionNumber: number;
  sourceType: ResumeVersionSourceType;
  createdAt?: Date;
  /**
   * Null when the version was never analyzed. Zero would read as a failed
   * resume instead of one nobody scored yet.
   */
  score: number | null;
  resumeId: string;
  resumeTitle: string;
  parentVersionId: string | null;
}

/**
 * Counts behind the filter tabs of the list. They come from the same page of
 * items the response carries, so tab and list never disagree.
 */
export interface VersionTotals {
  all: number;
  uploads: number;
  rewrites: number;
}

export interface VersionList {
  versions: VersionListItem[];
  totals: VersionTotals;
}

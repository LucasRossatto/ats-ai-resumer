import { Resume } from '@domain/entities/Resume';
import { ResumeVersion } from '@domain/entities/ResumeVersion';
import { VersionListItem, VersionTotals } from '@domain/entities/Version';

/**
 * Shown when a version points at a resume that is no longer readable, so the
 * card still renders instead of collapsing into an empty title.
 */
const FALLBACK_RESUME_TITLE = 'Resume';

export class VersionsDomainService {
  /**
   * Business Logic: Flatten every version of every resume into one list, each
   * item carrying the title of the resume it came from and the score of its
   * latest analysis. Versions whose resume is missing are kept: the resume was
   * soft deleted or is out of reach, and dropping the version would silently
   * shrink the history the totals report.
   */
  buildItems(
    versions: ResumeVersion[],
    resumes: Resume[],
    scoreByVersionId: Map<string, number>,
  ): VersionListItem[] {
    const resumeById = new Map(resumes.map((resume) => [resume.id, resume]));

    return versions.map((version) => ({
      id: version.id,
      label: version.label,
      versionNumber: version.versionNumber,
      sourceType: version.sourceType,
      createdAt: version.createdAt,
      score: scoreByVersionId.get(version.id) ?? null,
      resumeId: version.resumeId,
      resumeTitle:
        resumeById.get(version.resumeId)?.title ?? FALLBACK_RESUME_TITLE,
      parentVersionId: version.parentVersionId ?? null,
    }));
  }

  /**
   * Business Logic: How the list splits across the filter tabs. Counted over
   * the items themselves rather than queried apart, so a tab can never claim a
   * number the list below it does not show.
   */
  buildTotals(items: VersionListItem[]): VersionTotals {
    return {
      all: items.length,
      uploads: items.filter((item) => item.sourceType === 'upload').length,
      rewrites: items.filter((item) => item.sourceType === 'rewrite').length,
    };
  }
}

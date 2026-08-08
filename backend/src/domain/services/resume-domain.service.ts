import { v4 as uuidv4 } from 'uuid';
import { AnalysisStat, BulletRewrite } from '@domain/entities/Analysis';
import { Resume, ResumeListItem } from '@domain/entities/Resume';
import {
  ExperienceItem,
  ParsedSections,
  ProjectItem,
  ResumeVersion,
  ResumeVersionDetail,
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

  /**
   * Business Logic: Assemble the version produced by applying bullet rewrites
   * on top of an existing one.
   */
  createRewriteVersionEntity(
    resumeId: string,
    versionNumber: number,
    rawText: string,
    parsedSections: ParsedSections,
    parentVersionId: string,
  ): Partial<ResumeVersion> {
    return {
      id: this.generateVersionId(),
      resumeId,
      versionNumber,
      label: this.buildVersionLabel(versionNumber),
      rawText,
      parsedSections,
      sourceType: 'rewrite',
      parentVersionId,
      latestAnalysisId: null,
    };
  }

  /**
   * Business Logic: The resume list, each row carrying the best result any of
   * its analyses ever reached. A resume nobody analyzed keeps a null score: a
   * zero would rank it as the worst one instead of the unmeasured one.
   */
  buildListItems(resumes: Resume[], stats: AnalysisStat[]): ResumeListItem[] {
    const bestByResumeId = this.bestScoreByResumeId(stats);

    return resumes.map((resume) => ({
      id: resume.id,
      title: resume.title,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
      currentVersionId: resume.currentVersionId ?? null,
      latestVersionNumber: resume.latestVersionNumber,
      bestScore: bestByResumeId.get(resume.id) ?? null,
    }));
  }

  /**
   * Business Logic: Pair each version with the score of its latest analysis,
   * leaving the ones nobody analyzed as null.
   */
  attachScores(
    versions: ResumeVersion[],
    scoreByVersionId: Map<string, number>,
  ): ResumeVersionDetail[] {
    return versions.map((version) => ({
      ...version,
      score: scoreByVersionId.get(version.id) ?? null,
    }));
  }

  /**
   * Business Logic: Highest score each resume ever reached, across its whole
   * analysis history rather than its current version alone. Improving a resume
   * and then regressing does not erase the best it once hit.
   */
  private bestScoreByResumeId(stats: AnalysisStat[]): Map<string, number> {
    const best = new Map<string, number>();

    for (const stat of stats) {
      const current = best.get(stat.resumeId);

      if (current === undefined || stat.atsScore > current) {
        best.set(stat.resumeId, stat.atsScore);
      }
    }

    return best;
  }

  /**
   * Business Logic: Apply the chosen rewrites to the raw text of a version.
   * Only the first occurrence of each original bullet is swapped, so a phrase
   * repeated across jobs does not get rewritten everywhere at once. When the
   * original cannot be located - the text may have drifted since the analysis
   * ran - the rewrite is appended as a strengthened alternative line instead
   * of being silently dropped.
   */
  applyRewritesToText(rawText: string, rewrites: BulletRewrite[]): string {
    let result = rawText || '';

    for (const rewrite of rewrites) {
      if (!rewrite.original || !rewrite.rewritten) {
        continue;
      }

      const index = result.indexOf(rewrite.original);

      if (index >= 0) {
        result =
          result.slice(0, index) +
          rewrite.rewritten +
          result.slice(index + rewrite.original.length);
      } else {
        result += `\n${rewrite.rewritten}`;
      }
    }

    return result;
  }

  /**
   * Business Logic: Mirror of applyRewritesToText over the structured copy.
   * Used as the safety net for the new version, so it never lands with empty
   * sections when the re-parse of the rewritten text fails.
   */
  patchBulletsInSections(
    sections: ParsedSections | undefined,
    rewrites: BulletRewrite[],
  ): ParsedSections {
    const base: ParsedSections = sections ? { ...sections } : {};

    const swap = (text: string | undefined): string | undefined => {
      let result = text;

      for (const rewrite of rewrites) {
        if (!result || !rewrite.original || !rewrite.rewritten) {
          continue;
        }

        const index = result.indexOf(rewrite.original);

        if (index >= 0) {
          result =
            result.slice(0, index) +
            rewrite.rewritten +
            result.slice(index + rewrite.original.length);
        }
      }

      return result;
    };

    const patched: ParsedSections = {
      ...base,
      summary: swap(base.summary),
    };

    if (base.experience) {
      patched.experience = base.experience.map(
        (item): ExperienceItem => ({
          ...item,
          bullets: item.bullets?.map((bullet) => swap(bullet)),
        }),
      );
    }

    if (base.projects) {
      patched.projects = base.projects.map(
        (item): ProjectItem => ({
          ...item,
          description: swap(item.description),
        }),
      );
    }

    return patched;
  }

  /**
   * Business Logic: Decide whether a parse result is unusable. A version with
   * neither identity nor body is worse than the patched copy of its parent.
   */
  looksEmpty(sections: ParsedSections | undefined): boolean {
    if (!sections) {
      return true;
    }

    const basics = sections.basics || {};
    const hasIdentity = !!(basics.name || basics.email || basics.title);
    const hasBody = !!(
      sections.summary ||
      sections.experience?.length ||
      sections.education?.length ||
      sections.skills?.length
    );

    return !hasIdentity && !hasBody;
  }
}

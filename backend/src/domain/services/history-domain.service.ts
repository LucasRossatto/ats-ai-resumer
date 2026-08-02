import { AnalysisStat } from '@domain/entities/Analysis';
import { HistoryEvent, HistoryTotals } from '@domain/entities/History';
import { Resume } from '@domain/entities/Resume';
import { ResumeVersion } from '@domain/entities/ResumeVersion';

/**
 * Shown when an event points at a resume that is no longer readable. The
 * cascade soft deletes the analyses with the resume, so this is a guard rather
 * than an everyday path.
 */
const FALLBACK_RESUME_TITLE = 'Resume';
/** Same fallback inside a sentence, where the title reads as a common noun. */
const FALLBACK_RESUME_NAME = 'resume';

export class HistoryDomainService {
  /**
   * Business Logic: Merge everything that ever happened to the resumes of a
   * user into one timeline, newest first. An upload event is derived from the
   * resume itself rather than from its first version: creating a resume and
   * parsing it into V1 is one act to the user, and listing both would double
   * every entry in the feed.
   *
   * `limit` keeps only the head of the timeline, for callers that show a recent
   * excerpt rather than the whole thing: the dashboard feed asks for the last
   * few, the history page passes nothing and gets everything. Cutting after the
   * sort rather than per source is what makes the excerpt the genuinely newest
   * events instead of the newest of each kind.
   */
  buildEvents(
    resumes: Resume[],
    versions: ResumeVersion[],
    analyses: AnalysisStat[],
    limit?: number,
  ): HistoryEvent[] {
    const resumeById = new Map(resumes.map((resume) => [resume.id, resume]));

    const events: HistoryEvent[] = [
      ...this.buildUploadEvents(resumes),
      ...this.buildRewriteEvents(versions, resumeById),
      ...this.buildAnalyzeEvents(analyses, resumeById),
    ];

    const sorted = this.sortNewestFirst(events);

    return limit === undefined ? sorted : sorted.slice(0, limit);
  }

  /**
   * Business Logic: How the timeline splits across the filter tabs.
   */
  buildTotals(events: HistoryEvent[]): HistoryTotals {
    return {
      all: events.length,
      upload: this.countByType(events, 'upload'),
      analyze: this.countByType(events, 'analyze'),
      rewrite: this.countByType(events, 'rewrite'),
    };
  }

  private buildUploadEvents(resumes: Resume[]): HistoryEvent[] {
    return resumes.map((resume) => ({
      id: `r-${resume.id}`,
      type: 'upload' as const,
      title: `${resume.title} uploaded`,
      subtitle: 'Parsed and version V1 created',
      label: 'V1',
      at: resume.createdAt,
      resumeId: resume.id,
      resumeTitle: resume.title,
    }));
  }

  /**
   * Only rewrites become events here. An upload version is already reported by
   * the resume that carries it.
   */
  private buildRewriteEvents(
    versions: ResumeVersion[],
    resumeById: Map<string, Resume>,
  ): HistoryEvent[] {
    return versions
      .filter((version) => version.sourceType === 'rewrite')
      .map((version) => {
        const resume = resumeById.get(version.resumeId);
        return {
          id: `v-${version.id}`,
          type: 'rewrite' as const,
          title: `${version.label} created for ${resume?.title ?? FALLBACK_RESUME_NAME}`,
          subtitle: 'Rewrites applied to previous version',
          label: `${version.label} created`,
          at: version.createdAt,
          resumeId: version.resumeId,
          resumeTitle: resume?.title ?? FALLBACK_RESUME_TITLE,
        };
      });
  }

  private buildAnalyzeEvents(
    analyses: AnalysisStat[],
    resumeById: Map<string, Resume>,
  ): HistoryEvent[] {
    return analyses.map((analysis) => {
      const resume = resumeById.get(analysis.resumeId);
      return {
        id: `a-${analysis.id}`,
        type: 'analyze' as const,
        title: `Analysis complete on ${resume?.title ?? FALLBACK_RESUME_NAME}`,
        subtitle: `ATS score ${analysis.atsScore} / 100`,
        label: `${analysis.atsScore}`,
        at: analysis.createdAt,
        resumeId: analysis.resumeId,
        resumeTitle: resume?.title ?? FALLBACK_RESUME_TITLE,
      };
    });
  }

  /**
   * An event with no timestamp sinks to the bottom instead of jumping to the
   * top, which is where `undefined` would land it in a raw date comparison.
   */
  private sortNewestFirst(events: HistoryEvent[]): HistoryEvent[] {
    return [...events].sort(
      (first, second) => this.toTime(second.at) - this.toTime(first.at),
    );
  }

  private toTime(at?: Date): number {
    return at ? new Date(at).getTime() : 0;
  }

  private countByType(
    events: HistoryEvent[],
    type: HistoryEvent['type'],
  ): number {
    return events.filter((event) => event.type === type).length;
  }
}

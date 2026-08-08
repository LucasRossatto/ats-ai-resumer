import { AnalysisStat } from '@domain/entities/Analysis';
import {
  DashboardKpi,
  DashboardResumeRef,
  ScorePoint,
  SparkPoint,
  VersionStackItem,
} from '@domain/entities/Dashboard';
import { Resume } from '@domain/entities/Resume';
import { ResumeVersion } from '@domain/entities/ResumeVersion';

const SPARK_LENGTH = 10;
const VERSION_STACK_SIZE = 3;

interface ScoredVersion {
  id: string;
  label: string;
  versionNumber: number;
  sourceType: ResumeVersion['sourceType'];
  createdAt?: Date;
  score: number | null;
}

export class DashboardDomainService {
  /**
   * Business Logic: Reduce a resume to what the dashboard header shows. Never
   * carries versions or text, the panels below fetch what they need.
   */
  toResumeRef(resume: Resume): DashboardResumeRef {
    return {
      id: resume.id,
      title: resume.title,
      latestVersionNumber: resume.latestVersionNumber,
      currentVersionId: resume.currentVersionId ?? null,
      updatedAt: resume.updatedAt,
    };
  }

  /**
   * Business Logic: The score line of a resume over time. Versions that were
   * never analyzed have no point on the chart, plotting them as zero would
   * read as a collapse in quality instead of a gap in data.
   */
  buildScoreSeries(
    versions: ResumeVersion[],
    scoreByVersionId: Map<string, number>,
  ): ScorePoint[] {
    return this.withScores(versions, scoreByVersionId)
      .filter(
        (version): version is ScoredVersion & { score: number } =>
          version.score !== null,
      )
      .map((version) => ({
        versionId: version.id,
        label: version.label,
        score: version.score,
        createdAt: version.createdAt,
      }));
  }

  /**
   * Business Logic: The last few versions of a resume as a stack of cards, each
   * carrying the move it made against the previous scored version. The delta is
   * computed over the full history before slicing, so the oldest card in the
   * stack still reports a real move rather than a flat zero.
   */
  buildVersionStack(
    versions: ResumeVersion[],
    scoreByVersionId: Map<string, number>,
  ): VersionStackItem[] {
    const scored = this.withScores(versions, scoreByVersionId);

    let previousScore: number | null = null;

    const stack = scored.map((version) => {
      const delta =
        version.score !== null && previousScore !== null
          ? version.score - previousScore
          : 0;

      if (version.score !== null) {
        previousScore = version.score;
      }

      return {
        id: version.id,
        label: version.label,
        title: this.buildVersionTitle(version),
        score: version.score ?? 0,
        delta,
      };
    });

    return stack.slice(-VERSION_STACK_SIZE);
  }

  /**
   * Business Logic: The four headline cards. `stats` comes oldest first, so the
   * end of the list is the most recent reading and the tail is the sparkline.
   */
  buildKpi(resumes: Resume[], stats: AnalysisStat[]): DashboardKpi {
    const latest = stats[stats.length - 1];
    const previous = stats[stats.length - 2];
    const recent = stats.slice(-SPARK_LENGTH);

    return {
      atsScore: {
        value: latest?.atsScore ?? null,
        delta: this.delta(latest?.atsScore, previous?.atsScore),
        spark: this.toSpark(recent.map((stat) => stat.atsScore)),
      },
      versions: {
        value: resumes.reduce(
          (total, resume) => total + (resume.latestVersionNumber || 1),
          0,
        ),
        /**
         * There is no previous reading to compare against: the count is a
         * running total, not a measurement taken per analysis.
         */
        delta: null,
        spark: this.toSpark(
          resumes
            .slice(0, SPARK_LENGTH)
            .reverse()
            .map((resume) => resume.latestVersionNumber || 1),
        ),
      },
      keywordsMatched: {
        value: latest?.keywordsPresentCount ?? null,
        delta: this.delta(
          latest?.keywordsPresentCount,
          previous?.keywordsPresentCount,
        ),
        spark: this.toSpark(recent.map((stat) => stat.keywordsPresentCount)),
        /**
         * Every keyword the latest analysis looked at, covered or not. Derived
         * here rather than counted by the client, which only receives the two
         * halves and would have to know they add up to the whole.
         */
        total: latest
          ? latest.keywordsPresentCount + latest.keywordsMissingCount
          : null,
      },
      issuesIdentified: {
        value: latest?.issuesCount ?? null,
        delta: this.delta(latest?.issuesCount, previous?.issuesCount),
        spark: this.toSpark(recent.map((stat) => stat.issuesCount)),
      },
    };
  }

  /**
   * Business Logic: Pair each version with the score of its latest analysis,
   * leaving the ones that were never analyzed as null.
   */
  private withScores(
    versions: ResumeVersion[],
    scoreByVersionId: Map<string, number>,
  ): ScoredVersion[] {
    return versions.map((version) => ({
      id: version.id,
      label: version.label,
      versionNumber: version.versionNumber,
      sourceType: version.sourceType,
      createdAt: version.createdAt,
      score: scoreByVersionId.get(version.id) ?? null,
    }));
  }

  /**
   * Business Logic: How a version came to exist, in the words the card uses.
   */
  private buildVersionTitle(version: ScoredVersion): string {
    if (version.sourceType === 'upload') {
      return 'Upload';
    }

    if (version.sourceType === 'rewrite') {
      return 'Rewrite pass';
    }

    return version.label;
  }

  private delta(current?: number, previous?: number): number | null {
    if (current === undefined || previous === undefined) {
      return null;
    }

    return current - previous;
  }

  private toSpark(values: number[]): SparkPoint[] {
    return values.map((value) => ({ value }));
  }
}

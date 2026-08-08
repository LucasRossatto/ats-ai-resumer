import { AnalysisInsight } from '@domain/entities/Analysis';
import {
  BestScore,
  InsightResumeRef,
  IssueFrequency,
  KeywordFrequency,
  ResumePerformance,
  ScoreTrendPoint,
} from '@domain/entities/Insights';
import { Resume } from '@domain/entities/Resume';

const TOP_ISSUES = 6;
const TOP_KEYWORDS = 12;
const FALLBACK_RESUME_TITLE = 'resume';
const DEFAULT_SEVERITY = 'medium';

interface FrequencyRow<T> {
  key: string;
  count: number;
  sample: T;
}

export class InsightsDomainService {
  /**
   * Business Logic: Reduce a resume to what the insights page lists, including
   * the ones never analyzed: they are what the empty state invites the user to
   * act on.
   */
  toResumeRef(resume: Resume): InsightResumeRef {
    return {
      id: resume.id,
      title: resume.title,
      latestVersionNumber: resume.latestVersionNumber,
    };
  }

  /**
   * Business Logic: Average ATS score across every analysis the user ran.
   */
  averageScore(analyses: AnalysisInsight[]): number | null {
    if (!analyses.length) {
      return null;
    }

    const total = analyses.reduce(
      (sum, analysis) => sum + analysis.atsScore,
      0,
    );

    return Math.round(total / analyses.length);
  }

  /**
   * Business Logic: The best result the user ever got. Ties keep the earliest
   * analysis, the score was reached then and matching it later is not a new
   * best.
   */
  bestScore(analyses: AnalysisInsight[], resumes: Resume[]): BestScore | null {
    if (!analyses.length) {
      return null;
    }

    const best = analyses.reduce((winner, analysis) =>
      analysis.atsScore > winner.atsScore ? analysis : winner,
    );

    return {
      value: best.atsScore,
      resumeId: best.resumeId,
      resumeTitle: this.resolveTitle(resumes, best.resumeId),
      createdAt: best.createdAt,
    };
  }

  /**
   * Business Logic: Every analysis as a point on the timeline. `analyses` comes
   * oldest first, which is the order the chart draws.
   */
  buildScoreTrend(
    analyses: AnalysisInsight[],
    resumes: Resume[],
  ): ScoreTrendPoint[] {
    const titleByResumeId = this.titleMap(resumes);

    return analyses.map((analysis) => ({
      score: analysis.atsScore,
      resumeId: analysis.resumeId,
      resumeTitle:
        titleByResumeId.get(analysis.resumeId) || FALLBACK_RESUME_TITLE,
      at: analysis.createdAt,
    }));
  }

  /**
   * Business Logic: The problems that keep coming back. Grouping is done on the
   * lowercased title so the same issue phrased with different casing across
   * runs counts once, while the reported title keeps the casing of the first
   * time it was seen.
   */
  buildTopIssues(analyses: AnalysisInsight[]): IssueFrequency[] {
    const issues = analyses.flatMap((analysis) => analysis.issues || []);

    return this.topN(
      issues,
      (issue) => issue.title?.trim().toLowerCase(),
      TOP_ISSUES,
    ).map((row) => ({
      title: row.sample.title?.trim() || row.key,
      count: row.count,
      severity: row.sample.severity || DEFAULT_SEVERITY,
    }));
  }

  /**
   * Business Logic: The keywords the resumes keep failing to cover, which is
   * the shortlist the user should work through next.
   */
  buildTopMissingKeywords(analyses: AnalysisInsight[]): KeywordFrequency[] {
    return this.topKeywords(
      analyses.flatMap((analysis) => analysis.keywordsMissing || []),
    );
  }

  /**
   * Business Logic: The keywords the resumes reliably cover, the counterpart
   * that shows what is already working.
   */
  buildTopPresentKeywords(analyses: AnalysisInsight[]): KeywordFrequency[] {
    return this.topKeywords(
      analyses.flatMap((analysis) => analysis.keywordsPresent || []),
    );
  }

  /**
   * Business Logic: One row per analyzed resume, ranked by where it stands
   * today. Resumes never analyzed have nothing to compare and stay out.
   */
  buildResumePerformance(
    resumes: Resume[],
    analyses: AnalysisInsight[],
  ): ResumePerformance[] {
    const byResumeId = new Map<string, AnalysisInsight[]>();

    for (const analysis of analyses) {
      const bucket = byResumeId.get(analysis.resumeId);

      if (bucket) {
        bucket.push(analysis);
      } else {
        byResumeId.set(analysis.resumeId, [analysis]);
      }
    }

    const performance: ResumePerformance[] = [];

    for (const resume of resumes) {
      const own = byResumeId.get(resume.id);

      if (!own?.length) {
        continue;
      }

      const first = own[0];
      const latest = own[own.length - 1];
      const best = own.reduce((winner, analysis) =>
        analysis.atsScore > winner.atsScore ? analysis : winner,
      );

      performance.push({
        resumeId: resume.id,
        title: resume.title,
        analysesCount: own.length,
        latestScore: latest.atsScore,
        bestScore: best.atsScore,
        improvement: latest.atsScore - first.atsScore,
      });
    }

    return performance.sort((a, b) => b.latestScore - a.latestScore);
  }

  private topKeywords(keywords: string[]): KeywordFrequency[] {
    return this.topN(
      keywords,
      (keyword) => keyword?.trim().toLowerCase(),
      TOP_KEYWORDS,
    ).map((row) => ({
      keyword: row.sample.trim(),
      count: row.count,
    }));
  }

  /**
   * Business Logic: Count how often each key repeats and keep the heaviest
   * ones. The first item seen under a key is carried along as the sample, so
   * the caller can report the original wording instead of the normalized key.
   * Ties keep the order of first appearance.
   */
  private topN<T>(
    items: T[],
    getKey: (item: T) => string | undefined,
    limit: number,
  ): FrequencyRow<T>[] {
    const counts = new Map<string, number>();
    const samples = new Map<string, T>();

    for (const item of items) {
      const key = getKey(item);

      if (!key) {
        continue;
      }

      counts.set(key, (counts.get(key) || 0) + 1);

      if (!samples.has(key)) {
        samples.set(key, item);
      }
    }

    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([key, count]) => ({
        key,
        count,
        sample: samples.get(key) as T,
      }));
  }

  private titleMap(resumes: Resume[]): Map<string, string> {
    return new Map(resumes.map((resume) => [resume.id, resume.title]));
  }

  private resolveTitle(resumes: Resume[], resumeId: string): string {
    return this.titleMap(resumes).get(resumeId) || FALLBACK_RESUME_TITLE;
  }
}

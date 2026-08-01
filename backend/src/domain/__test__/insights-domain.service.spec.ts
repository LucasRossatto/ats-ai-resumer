import { AnalysisInsight } from '@domain/entities/Analysis';
import { Resume } from '@domain/entities/Resume';
import { InsightsDomainService } from '@domain/services/insights-domain.service';

describe('InsightsDomainService', () => {
  let service: InsightsDomainService;

  const buildAnalysis = (
    overrides: Partial<AnalysisInsight> = {},
  ): AnalysisInsight => ({
    id: 'analysis-1',
    resumeId: 'resume-1',
    versionId: 'version-1',
    atsScore: 60,
    issues: [],
    keywordsPresent: [],
    keywordsMissing: [],
    createdAt: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  });

  const buildResume = (overrides: Partial<Resume> = {}): Resume =>
    ({
      id: 'resume-1',
      userId: 'auth-1',
      title: 'Backend CV',
      latestVersionNumber: 2,
      ...overrides,
    }) as Resume;

  beforeEach(() => {
    service = new InsightsDomainService();
  });

  describe('averageScore', () => {
    it('rounds the average of every analysis', () => {
      const analyses = [
        buildAnalysis({ atsScore: 60 }),
        buildAnalysis({ atsScore: 71 }),
        buildAnalysis({ atsScore: 80 }),
      ];

      expect(service.averageScore(analyses)).toBe(70);
    });

    it('is null without analyses', () => {
      expect(service.averageScore([])).toBeNull();
    });
  });

  describe('bestScore', () => {
    it('reports the highest score with the resume it belongs to', () => {
      const analyses = [
        buildAnalysis({ id: 'analysis-1', atsScore: 60 }),
        buildAnalysis({ id: 'analysis-2', atsScore: 91, resumeId: 'resume-2' }),
      ];
      const resumes = [
        buildResume(),
        buildResume({ id: 'resume-2', title: 'Data CV' }),
      ];

      expect(service.bestScore(analyses, resumes)).toMatchObject({
        value: 91,
        resumeId: 'resume-2',
        resumeTitle: 'Data CV',
      });
    });

    it('keeps the earliest analysis when the score is tied', () => {
      const analyses = [
        buildAnalysis({ id: 'analysis-1', atsScore: 88 }),
        buildAnalysis({ id: 'analysis-2', atsScore: 88 }),
      ];

      expect(service.bestScore(analyses, [buildResume()])?.createdAt).toEqual(
        analyses[0].createdAt,
      );
    });

    it('falls back to a generic title when the resume is gone', () => {
      const best = service.bestScore([buildAnalysis()], []);

      expect(best?.resumeTitle).toBe('resume');
    });

    it('is null without analyses', () => {
      expect(service.bestScore([], [buildResume()])).toBeNull();
    });
  });

  describe('buildScoreTrend', () => {
    it('names each point after its resume, in the order received', () => {
      const analyses = [
        buildAnalysis({ atsScore: 55 }),
        buildAnalysis({ atsScore: 70, resumeId: 'resume-2' }),
      ];
      const resumes = [
        buildResume(),
        buildResume({ id: 'resume-2', title: 'Data CV' }),
      ];

      expect(service.buildScoreTrend(analyses, resumes)).toEqual([
        {
          score: 55,
          resumeId: 'resume-1',
          resumeTitle: 'Backend CV',
          createdAt: analyses[0].createdAt,
        },
        {
          score: 70,
          resumeId: 'resume-2',
          resumeTitle: 'Data CV',
          createdAt: analyses[1].createdAt,
        },
      ]);
    });
  });

  describe('buildTopIssues', () => {
    it('groups the same issue across analyses ignoring casing and spacing', () => {
      const analyses = [
        buildAnalysis({
          issues: [
            { title: 'Missing metrics', severity: 'high' },
            { title: 'Long bullets', severity: 'low' },
          ],
        }),
        buildAnalysis({ issues: [{ title: '  missing METRICS  ' }] }),
      ];

      const issues = service.buildTopIssues(analyses);

      expect(issues[0]).toEqual({
        title: 'Missing metrics',
        count: 2,
        severity: 'high',
      });
      expect(issues[1]).toEqual({
        title: 'Long bullets',
        count: 1,
        severity: 'low',
      });
    });

    it('defaults the severity when the analysis did not set one', () => {
      const issues = service.buildTopIssues([
        buildAnalysis({ issues: [{ title: 'Weak summary' }] }),
      ]);

      expect(issues[0].severity).toBe('medium');
    });

    it('keeps at most six issues, the heaviest first', () => {
      const issues = Array.from({ length: 9 }, (_, index) => ({
        title: `Issue ${index}`,
      }));
      const analyses = [
        buildAnalysis({ issues }),
        buildAnalysis({ issues: [{ title: 'Issue 8' }] }),
      ];

      const top = service.buildTopIssues(analyses);

      expect(top).toHaveLength(6);
      expect(top[0]).toMatchObject({ title: 'Issue 8', count: 2 });
    });

    it('returns nothing when no analysis reported an issue', () => {
      expect(service.buildTopIssues([buildAnalysis()])).toEqual([]);
    });
  });

  describe('keyword frequency', () => {
    it('counts missing keywords ignoring casing and keeps the first wording', () => {
      const analyses = [
        buildAnalysis({ keywordsMissing: ['Kubernetes', 'GraphQL'] }),
        buildAnalysis({ keywordsMissing: ['kubernetes'] }),
      ];

      expect(service.buildTopMissingKeywords(analyses)).toEqual([
        { keyword: 'Kubernetes', count: 2 },
        { keyword: 'GraphQL', count: 1 },
      ]);
    });

    it('counts present keywords the same way', () => {
      const analyses = [
        buildAnalysis({ keywordsPresent: ['Node.js'] }),
        buildAnalysis({ keywordsPresent: ['node.js', 'Docker'] }),
      ];

      expect(service.buildTopPresentKeywords(analyses)).toEqual([
        { keyword: 'Node.js', count: 2 },
        { keyword: 'Docker', count: 1 },
      ]);
    });

    it('keeps at most twelve keywords', () => {
      const keywordsMissing = Array.from(
        { length: 15 },
        (_, index) => `kw-${index}`,
      );

      expect(
        service.buildTopMissingKeywords([buildAnalysis({ keywordsMissing })]),
      ).toHaveLength(12);
    });
  });

  describe('buildResumePerformance', () => {
    it('measures each resume from its first analysis to its latest', () => {
      const resumes = [buildResume()];
      const analyses = [
        buildAnalysis({ id: 'analysis-1', atsScore: 50 }),
        buildAnalysis({ id: 'analysis-2', atsScore: 85 }),
        buildAnalysis({ id: 'analysis-3', atsScore: 74 }),
      ];

      expect(service.buildResumePerformance(resumes, analyses)).toEqual([
        {
          resumeId: 'resume-1',
          title: 'Backend CV',
          analysesCount: 3,
          latestScore: 74,
          bestScore: 85,
          improvement: 24,
        },
      ]);
    });

    it('ranks the resumes by where they stand today', () => {
      const resumes = [
        buildResume({ id: 'resume-1', title: 'Backend CV' }),
        buildResume({ id: 'resume-2', title: 'Data CV' }),
      ];
      const analyses = [
        buildAnalysis({ id: 'analysis-1', resumeId: 'resume-1', atsScore: 60 }),
        buildAnalysis({ id: 'analysis-2', resumeId: 'resume-2', atsScore: 90 }),
      ];

      expect(
        service.buildResumePerformance(resumes, analyses).map((r) => r.title),
      ).toEqual(['Data CV', 'Backend CV']);
    });

    it('reports a negative improvement when the resume regressed', () => {
      const analyses = [
        buildAnalysis({ id: 'analysis-1', atsScore: 80 }),
        buildAnalysis({ id: 'analysis-2', atsScore: 65 }),
      ];

      expect(
        service.buildResumePerformance([buildResume()], analyses)[0],
      ).toMatchObject({ improvement: -15, bestScore: 80, latestScore: 65 });
    });

    it('leaves out resumes that were never analyzed', () => {
      const resumes = [
        buildResume(),
        buildResume({ id: 'resume-2', title: 'Never analyzed' }),
      ];

      expect(
        service.buildResumePerformance(resumes, [buildAnalysis()]),
      ).toHaveLength(1);
    });
  });

  describe('toResumeRef', () => {
    it('carries only the fields the list shows', () => {
      expect(service.toResumeRef(buildResume())).toEqual({
        id: 'resume-1',
        title: 'Backend CV',
        latestVersionNumber: 2,
      });
    });
  });
});

import { AnalysisStat } from '@domain/entities/Analysis';
import { Resume } from '@domain/entities/Resume';
import { ResumeVersion } from '@domain/entities/ResumeVersion';
import { DashboardDomainService } from '@domain/services/dashboard-domain.service';

describe('DashboardDomainService', () => {
  let service: DashboardDomainService;

  const buildVersion = (
    overrides: Partial<ResumeVersion> = {},
  ): ResumeVersion =>
    ({
      id: 'version-1',
      resumeId: 'resume-1',
      versionNumber: 1,
      label: 'V1',
      sourceType: 'upload',
      createdAt: new Date('2026-01-01T10:00:00Z'),
      ...overrides,
    }) as ResumeVersion;

  const buildStat = (overrides: Partial<AnalysisStat> = {}): AnalysisStat => ({
    id: 'analysis-1',
    resumeId: 'resume-1',
    versionId: 'version-1',
    atsScore: 60,
    issuesCount: 4,
    keywordsPresentCount: 8,
    keywordsMissingCount: 3,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  });

  const buildResume = (overrides: Partial<Resume> = {}): Resume =>
    ({
      id: 'resume-1',
      userId: 'auth-1',
      title: 'Backend CV',
      currentVersionId: 'version-1',
      latestVersionNumber: 2,
      createdAt: new Date('2026-01-01T09:00:00Z'),
      updatedAt: new Date('2026-01-02T09:00:00Z'),
      ...overrides,
    }) as Resume;

  beforeEach(() => {
    service = new DashboardDomainService();
  });

  describe('buildScoreSeries', () => {
    it('plots only the versions that were analyzed', () => {
      const versions = [
        buildVersion({ id: 'version-1', label: 'V1' }),
        buildVersion({ id: 'version-2', label: 'V2', versionNumber: 2 }),
      ];
      const scores = new Map([['version-1', 72]]);

      const series = service.buildScoreSeries(versions, scores);

      expect(series).toEqual([
        {
          versionId: 'version-1',
          label: 'V1',
          score: 72,
          createdAt: versions[0].createdAt,
        },
      ]);
    });

    it('returns an empty series when nothing was analyzed', () => {
      expect(service.buildScoreSeries([buildVersion()], new Map())).toEqual([]);
    });
  });

  describe('buildVersionStack', () => {
    it('keeps the last three versions with the move each one made', () => {
      const versions = [
        buildVersion({ id: 'version-1', label: 'V1', versionNumber: 1 }),
        buildVersion({
          id: 'version-2',
          label: 'V2',
          versionNumber: 2,
          sourceType: 'rewrite',
        }),
        buildVersion({
          id: 'version-3',
          label: 'V3',
          versionNumber: 3,
          sourceType: 'rewrite',
        }),
        buildVersion({
          id: 'version-4',
          label: 'V4',
          versionNumber: 4,
          sourceType: 'rewrite',
        }),
      ];
      const scores = new Map([
        ['version-1', 50],
        ['version-2', 60],
        ['version-3', 58],
        ['version-4', 75],
      ]);

      const stack = service.buildVersionStack(versions, scores);

      expect(stack).toHaveLength(3);
      expect(stack.map((item) => item.label)).toEqual(['V2', 'V3', 'V4']);
      expect(stack.map((item) => item.delta)).toEqual([10, -2, 17]);
      expect(stack[0].title).toBe('Rewrite pass');
    });

    it('titles the uploaded version and reports zero delta for the first one', () => {
      const versions = [buildVersion({ id: 'version-1' })];
      const stack = service.buildVersionStack(
        versions,
        new Map([['version-1', 50]]),
      );

      expect(stack[0]).toEqual({
        id: 'version-1',
        label: 'V1',
        title: 'Upload',
        score: 50,
        delta: 0,
      });
    });

    it('scores an unanalyzed version as zero without breaking the chain', () => {
      const versions = [
        buildVersion({ id: 'version-1', label: 'V1' }),
        buildVersion({ id: 'version-2', label: 'V2', versionNumber: 2 }),
        buildVersion({ id: 'version-3', label: 'V3', versionNumber: 3 }),
      ];
      const scores = new Map([
        ['version-1', 50],
        ['version-3', 70],
      ]);

      const stack = service.buildVersionStack(versions, scores);

      expect(stack[1]).toMatchObject({ score: 0, delta: 0 });
      expect(stack[2]).toMatchObject({ score: 70, delta: 20 });
    });
  });

  describe('buildKpi', () => {
    it('reads the latest analysis and its move against the previous one', () => {
      const stats = [
        buildStat({ id: 'analysis-1', atsScore: 60, issuesCount: 5 }),
        buildStat({
          id: 'analysis-2',
          atsScore: 78,
          issuesCount: 2,
          keywordsPresentCount: 11,
        }),
      ];

      const kpi = service.buildKpi([buildResume()], stats);

      expect(kpi.atsScore).toEqual({
        value: 78,
        delta: 18,
        spark: [{ value: 60 }, { value: 78 }],
      });
      expect(kpi.issues).toMatchObject({ value: 2, delta: -3 });
      expect(kpi.keywords).toMatchObject({ value: 11, delta: 3 });
    });

    it('sums the version numbers of every resume and never deltas the total', () => {
      const resumes = [
        buildResume({ id: 'resume-1', latestVersionNumber: 3 }),
        buildResume({ id: 'resume-2', latestVersionNumber: 2 }),
      ];

      const kpi = service.buildKpi(resumes, []);

      expect(kpi.versions.value).toBe(5);
      expect(kpi.versions.delta).toBeNull();
      expect(kpi.versions.spark).toEqual([{ value: 2 }, { value: 3 }]);
    });

    it('leaves the analysis cards empty for a user with no history', () => {
      const kpi = service.buildKpi([], []);

      expect(kpi.atsScore).toEqual({ value: null, delta: null, spark: [] });
      expect(kpi.issues.value).toBeNull();
      expect(kpi.versions.value).toBe(0);
    });

    it('has no delta when a single analysis exists', () => {
      const kpi = service.buildKpi([buildResume()], [buildStat()]);

      expect(kpi.atsScore.value).toBe(60);
      expect(kpi.atsScore.delta).toBeNull();
    });

    it('caps the sparkline at the ten most recent readings', () => {
      const stats = Array.from({ length: 14 }, (_, index) =>
        buildStat({ id: `analysis-${index}`, atsScore: index }),
      );

      const kpi = service.buildKpi([], stats);

      expect(kpi.atsScore.spark).toHaveLength(10);
      expect(kpi.atsScore.spark[0]).toEqual({ value: 4 });
    });
  });

  describe('buildActivity', () => {
    it('merges uploads, rewrites and analyses newest first', () => {
      const resumes = [
        buildResume({
          id: 'resume-1',
          title: 'Backend CV',
          createdAt: new Date('2026-01-01T10:00:00Z'),
        }),
      ];
      const versions = [
        buildVersion({
          id: 'version-2',
          label: 'V2',
          sourceType: 'rewrite',
          createdAt: new Date('2026-01-03T10:00:00Z'),
        }),
      ];
      const stats = [
        buildStat({
          id: 'analysis-1',
          atsScore: 81,
          createdAt: new Date('2026-01-02T10:00:00Z'),
        }),
      ];

      const activity = service.buildActivity(resumes, versions, stats);

      expect(activity.map((event) => event.type)).toEqual([
        'rewrite',
        'analysis',
        'upload',
      ]);
      expect(activity[0].title).toBe('V2 created for Backend CV');
      expect(activity[1].subtitle).toBe('ATS score 81 / 100');
      expect(activity[2]).toMatchObject({
        title: 'Backend CV uploaded',
        label: 'V1',
        resumeId: 'resume-1',
      });
    });

    it('ignores versions that came from an upload, the resume already covers them', () => {
      const activity = service.buildActivity(
        [buildResume()],
        [buildVersion({ id: 'version-1', sourceType: 'upload' })],
        [],
      );

      expect(activity).toHaveLength(1);
      expect(activity[0].type).toBe('upload');
    });

    it('falls back to a generic name when the resume is missing', () => {
      const activity = service.buildActivity(
        [],
        [],
        [buildStat({ resumeId: 'resume-gone' })],
      );

      expect(activity[0].title).toBe('Analysis complete on resume');
    });

    it('caps the feed at eight events', () => {
      const resumes = Array.from({ length: 10 }, (_, index) =>
        buildResume({
          id: `resume-${index}`,
          createdAt: new Date(2026, 0, index + 1),
        }),
      );

      expect(service.buildActivity(resumes, [], [])).toHaveLength(8);
    });
  });

  describe('toResumeRef', () => {
    it('carries only the header fields of the resume', () => {
      const resume = buildResume();

      expect(service.toResumeRef(resume)).toEqual({
        id: 'resume-1',
        title: 'Backend CV',
        latestVersionNumber: 2,
        currentVersionId: 'version-1',
        updatedAt: resume.updatedAt,
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '@application/services/dashboard.service';
import { LoggerService } from '@application/services/logger.service';
import { DashboardDomainService } from '@domain/services/dashboard-domain.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let resumeRepository: any;
  let versionRepository: any;
  let analysisRepository: any;

  const userId = 'auth-1';

  const resume = {
    id: 'resume-1',
    userId,
    title: 'Backend CV',
    currentVersionId: 'version-2',
    latestVersionNumber: 2,
    createdAt: new Date('2026-01-01T09:00:00Z'),
    updatedAt: new Date('2026-01-03T09:00:00Z'),
  };

  const versions = [
    {
      id: 'version-1',
      resumeId: 'resume-1',
      versionNumber: 1,
      label: 'V1',
      sourceType: 'upload',
      latestAnalysisId: 'analysis-1',
      createdAt: new Date('2026-01-01T10:00:00Z'),
    },
    {
      id: 'version-2',
      resumeId: 'resume-1',
      versionNumber: 2,
      label: 'V2',
      sourceType: 'rewrite',
      latestAnalysisId: 'analysis-2',
      createdAt: new Date('2026-01-03T10:00:00Z'),
    },
  ];

  const stats = [
    {
      id: 'analysis-2',
      resumeId: 'resume-1',
      versionId: 'version-2',
      atsScore: 82,
      issuesCount: 2,
      keywordsPresentCount: 12,
      keywordsMissingCount: 3,
      createdAt: new Date('2026-01-03T11:00:00Z'),
    },
    {
      id: 'analysis-1',
      resumeId: 'resume-1',
      versionId: 'version-1',
      atsScore: 64,
      issuesCount: 6,
      keywordsPresentCount: 7,
      keywordsMissingCount: 9,
      createdAt: new Date('2026-01-01T11:00:00Z'),
    },
  ];

  beforeEach(async () => {
    resumeRepository = {
      findAllByUserId: jest.fn().mockResolvedValue([resume]),
    };

    versionRepository = {
      findByResumeId: jest.fn().mockResolvedValue(versions),
      countByResumeIdsAndSourceType: jest.fn().mockResolvedValue(1),
      findRecentByResumeIds: jest.fn().mockResolvedValue([...versions].reverse()),
    };

    analysisRepository = {
      countByUserId: jest.fn().mockResolvedValue(2),
      findStatsByUserId: jest.fn().mockResolvedValue(stats),
      findStatsByIds: jest.fn().mockResolvedValue(stats),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        DashboardDomainService,
        { provide: 'IResumeRepository', useValue: resumeRepository },
        { provide: 'IResumeVersionRepository', useValue: versionRepository },
        { provide: 'IAnalysisRepository', useValue: analysisRepository },
        {
          provide: LoggerService,
          useValue: { logger: jest.fn(), warning: jest.fn(), err: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getOverview', () => {
    it('reports the totals of the user', async () => {
      const overview = await service.getOverview(userId);

      expect(overview.totals).toEqual({
        resumes: 1,
        rewrites: 1,
        analyses: 2,
        exports: 0,
      });
      expect(versionRepository.countByResumeIdsAndSourceType).toHaveBeenCalledWith(
        ['resume-1'],
        'rewrite',
      );
      expect(analysisRepository.countByUserId).toHaveBeenCalledWith(userId);
    });

    it('builds the panels of the most recently updated resume', async () => {
      const overview = await service.getOverview(userId);

      expect(overview.latestResume).toMatchObject({
        id: 'resume-1',
        title: 'Backend CV',
        latestVersionNumber: 2,
      });
      expect(overview.scoreSeries).toEqual([
        { versionId: 'version-1', label: 'V1', score: 64, createdAt: versions[0].createdAt },
        { versionId: 'version-2', label: 'V2', score: 82, createdAt: versions[1].createdAt },
      ]);
      expect(overview.versionStack).toHaveLength(2);
      expect(overview.versionStack[1]).toMatchObject({ score: 82, delta: 18 });
    });

    it('scores the version panels in a single lookup', async () => {
      await service.getOverview(userId);

      expect(analysisRepository.findStatsByIds).toHaveBeenCalledTimes(1);
      expect(analysisRepository.findStatsByIds).toHaveBeenCalledWith([
        'analysis-1',
        'analysis-2',
      ]);
    });

    it('feeds the KPI cards the history oldest first', async () => {
      const overview = await service.getOverview(userId);

      expect(overview.kpi.atsScore).toMatchObject({ value: 82, delta: 18 });
      expect(overview.kpi.atsScore.spark).toEqual([
        { value: 64 },
        { value: 82 },
      ]);
      expect(overview.kpi.versions.value).toBe(2);
    });

    it('lists the activity newest first', async () => {
      const overview = await service.getOverview(userId);

      expect(overview.activity.map((event) => event.type)).toEqual([
        'analysis',
        'rewrite',
        'analysis',
        'upload',
      ]);
    });

    it('returns empty panels for a user with no resumes', async () => {
      resumeRepository.findAllByUserId.mockResolvedValue([]);
      versionRepository.countByResumeIdsAndSourceType.mockResolvedValue(0);
      versionRepository.findRecentByResumeIds.mockResolvedValue([]);
      analysisRepository.countByUserId.mockResolvedValue(0);
      analysisRepository.findStatsByUserId.mockResolvedValue([]);

      const overview = await service.getOverview(userId);

      expect(overview.latestResume).toBeNull();
      expect(overview.scoreSeries).toEqual([]);
      expect(overview.versionStack).toEqual([]);
      expect(overview.activity).toEqual([]);
      expect(overview.totals.resumes).toBe(0);
      expect(overview.kpi.atsScore.value).toBeNull();
      expect(versionRepository.findByResumeId).not.toHaveBeenCalled();
    });

    it('skips versions that were never analyzed when scoring', async () => {
      versionRepository.findByResumeId.mockResolvedValue([
        { ...versions[0], latestAnalysisId: null },
        versions[1],
      ]);
      analysisRepository.findStatsByIds.mockResolvedValue([stats[0]]);

      const overview = await service.getOverview(userId);

      expect(analysisRepository.findStatsByIds).toHaveBeenCalledWith([
        'analysis-2',
      ]);
      expect(overview.scoreSeries).toHaveLength(1);
      expect(overview.scoreSeries[0].versionId).toBe('version-2');
    });
  });
});

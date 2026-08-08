import { Test, TestingModule } from '@nestjs/testing';
import { InsightsService } from '@application/services/insights.service';
import { LoggerService } from '@application/services/logger.service';
import { InsightsDomainService } from '@domain/services/insights-domain.service';

describe('InsightsService', () => {
  let service: InsightsService;
  let resumeRepository: any;
  let analysisRepository: any;

  const userId = 'auth-1';

  const resumes = [
    {
      id: 'resume-1',
      userId,
      title: 'Backend CV',
      latestVersionNumber: 2,
      updatedAt: new Date('2026-01-03T09:00:00Z'),
    },
    {
      id: 'resume-2',
      userId,
      title: 'Data CV',
      latestVersionNumber: 1,
      updatedAt: new Date('2026-01-02T09:00:00Z'),
    },
  ];

  const analyses = [
    {
      id: 'analysis-1',
      resumeId: 'resume-1',
      versionId: 'version-1',
      atsScore: 58,
      issues: [{ title: 'Missing metrics', severity: 'high' }],
      keywordsPresent: ['Node.js'],
      keywordsMissing: ['Kubernetes'],
      createdAt: new Date('2026-01-01T10:00:00Z'),
    },
    {
      id: 'analysis-2',
      resumeId: 'resume-1',
      versionId: 'version-2',
      atsScore: 82,
      issues: [{ title: 'missing metrics' }],
      keywordsPresent: ['Node.js', 'Docker'],
      keywordsMissing: ['Kubernetes'],
      createdAt: new Date('2026-01-03T10:00:00Z'),
    },
    {
      id: 'analysis-3',
      resumeId: 'resume-2',
      versionId: 'version-3',
      atsScore: 66,
      issues: [],
      keywordsPresent: [],
      keywordsMissing: ['GraphQL'],
      createdAt: new Date('2026-01-04T10:00:00Z'),
    },
  ];

  beforeEach(async () => {
    resumeRepository = {
      findAllByUserId: jest.fn().mockResolvedValue(resumes),
    };

    analysisRepository = {
      findInsightsByUserId: jest.fn().mockResolvedValue(analyses),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsightsService,
        InsightsDomainService,
        { provide: 'IResumeRepository', useValue: resumeRepository },
        { provide: 'IAnalysisRepository', useValue: analysisRepository },
        {
          provide: LoggerService,
          useValue: { logger: jest.fn(), warning: jest.fn(), err: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InsightsService>(InsightsService);
  });

  describe('getOverview', () => {
    it('summarizes the whole analysis history', async () => {
      const overview = await service.getOverview(userId);

      expect(overview.empty).toBe(false);
      expect(overview.totalAnalyses).toBe(3);
      expect(overview.averageScore).toBe(69);
      expect(overview.bestScore).toMatchObject({
        value: 82,
        resumeId: 'resume-1',
        resumeTitle: 'Backend CV',
      });
      expect(analysisRepository.findInsightsByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it('charts the trend and the recurring issues and keywords', async () => {
      const overview = await service.getOverview(userId);

      expect(overview.scoreTrend.map((point) => point.score)).toEqual([
        58, 82, 66,
      ]);
      expect(overview.topIssues[0]).toEqual({
        title: 'Missing metrics',
        count: 2,
        severity: 'high',
      });
      expect(overview.topMissingKeywords).toEqual([
        { keyword: 'Kubernetes', count: 2 },
        { keyword: 'GraphQL', count: 1 },
      ]);
      expect(overview.topPresentKeywords).toEqual([
        { keyword: 'Node.js', count: 2 },
        { keyword: 'Docker', count: 1 },
      ]);
    });

    it('ranks every analyzed resume by its latest score', async () => {
      const overview = await service.getOverview(userId);

      expect(overview.resumePerformance).toEqual([
        {
          resumeId: 'resume-1',
          title: 'Backend CV',
          analysesCount: 2,
          latestScore: 82,
          bestScore: 82,
          improvement: 24,
        },
        {
          resumeId: 'resume-2',
          title: 'Data CV',
          analysesCount: 1,
          latestScore: 66,
          bestScore: 66,
          improvement: 0,
        },
      ]);
    });

    it('lists every resume, analyzed or not', async () => {
      const overview = await service.getOverview(userId);

      expect(overview.resumes).toEqual([
        { id: 'resume-1', title: 'Backend CV', latestVersionNumber: 2 },
        { id: 'resume-2', title: 'Data CV', latestVersionNumber: 1 },
      ]);
    });

    it('flags the empty state but still lists the resumes to analyze', async () => {
      analysisRepository.findInsightsByUserId.mockResolvedValue([]);

      const overview = await service.getOverview(userId);

      expect(overview.empty).toBe(true);
      expect(overview.totalAnalyses).toBe(0);
      expect(overview.averageScore).toBeNull();
      expect(overview.bestScore).toBeNull();
      expect(overview.scoreTrend).toEqual([]);
      expect(overview.topIssues).toEqual([]);
      expect(overview.topMissingKeywords).toEqual([]);
      expect(overview.resumePerformance).toEqual([]);
      expect(overview.resumes).toHaveLength(2);
    });

    it('keeps the shape for a user with nothing at all', async () => {
      resumeRepository.findAllByUserId.mockResolvedValue([]);
      analysisRepository.findInsightsByUserId.mockResolvedValue([]);

      const overview = await service.getOverview(userId);

      expect(overview.empty).toBe(true);
      expect(overview.resumes).toEqual([]);
      expect(overview.bestScore).toBeNull();
    });
  });
});

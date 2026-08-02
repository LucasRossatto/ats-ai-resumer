import { Test, TestingModule } from '@nestjs/testing';
import { HistoryService } from '@application/services/history.service';
import { LoggerService } from '@application/services/logger.service';
import { HistoryDomainService } from '@domain/services/history-domain.service';

describe('HistoryService', () => {
  let service: HistoryService;
  let resumeRepository: any;
  let versionRepository: any;
  let analysisRepository: any;

  const userId = 'auth-1';

  const resumes = [
    {
      id: 'resume-1',
      userId,
      title: 'Backend CV',
      latestVersionNumber: 2,
      createdAt: new Date('2026-01-01T09:00:00Z'),
    },
    {
      id: 'resume-2',
      userId,
      title: 'Data CV',
      latestVersionNumber: 1,
      createdAt: new Date('2026-01-02T09:00:00Z'),
    },
  ];

  const versions = [
    {
      id: 'version-2',
      resumeId: 'resume-1',
      versionNumber: 2,
      label: 'V2',
      sourceType: 'rewrite',
      createdAt: new Date('2026-01-05T09:00:00Z'),
    },
    {
      id: 'version-1',
      resumeId: 'resume-1',
      versionNumber: 1,
      label: 'V1',
      sourceType: 'upload',
      createdAt: new Date('2026-01-01T09:00:00Z'),
    },
  ];

  const analyses = [
    {
      id: 'analysis-1',
      resumeId: 'resume-1',
      versionId: 'version-1',
      atsScore: 58,
      createdAt: new Date('2026-01-03T09:00:00Z'),
    },
  ];

  beforeEach(async () => {
    resumeRepository = {
      findAllByUserId: jest.fn().mockResolvedValue(resumes),
    };

    versionRepository = {
      findAllByResumeIds: jest.fn().mockResolvedValue(versions),
    };

    analysisRepository = {
      findAllStatsByUserId: jest.fn().mockResolvedValue(analyses),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        HistoryDomainService,
        { provide: 'IResumeRepository', useValue: resumeRepository },
        { provide: 'IResumeVersionRepository', useValue: versionRepository },
        { provide: 'IAnalysisRepository', useValue: analysisRepository },
        {
          provide: LoggerService,
          useValue: { logger: jest.fn(), warning: jest.fn(), err: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<HistoryService>(HistoryService);
  });

  describe('getAll', () => {
    it('merges every source into one timeline, newest first', async () => {
      const result = await service.getAll(userId);

      expect(result.events.map((event) => event.id)).toEqual([
        'v-version-2',
        'a-analysis-1',
        'r-resume-2',
        'r-resume-1',
      ]);
      expect(resumeRepository.findAllByUserId).toHaveBeenCalledWith(userId);
      expect(analysisRepository.findAllStatsByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it('scopes the versions to the resumes the user still owns', async () => {
      await service.getAll(userId);

      expect(versionRepository.findAllByResumeIds).toHaveBeenCalledWith([
        'resume-1',
        'resume-2',
      ]);
    });

    it('reports one upload per resume and skips the upload versions', async () => {
      const result = await service.getAll(userId);

      const uploads = result.events.filter((event) => event.type === 'upload');
      expect(uploads.map((event) => event.id)).toEqual([
        'r-resume-2',
        'r-resume-1',
      ]);
    });

    it('counts the totals per event type', async () => {
      const result = await service.getAll(userId);

      expect(result.totals).toEqual({
        all: 4,
        upload: 2,
        analyze: 1,
        rewrite: 1,
      });
    });

    it('keeps the shape for a user with no activity', async () => {
      resumeRepository.findAllByUserId.mockResolvedValue([]);
      versionRepository.findAllByResumeIds.mockResolvedValue([]);
      analysisRepository.findAllStatsByUserId.mockResolvedValue([]);

      const result = await service.getAll(userId);

      expect(result.events).toEqual([]);
      expect(result.totals).toEqual({
        all: 0,
        upload: 0,
        analyze: 0,
        rewrite: 0,
      });
    });
  });
});

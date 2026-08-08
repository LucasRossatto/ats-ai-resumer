import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@application/services/logger.service';
import { VersionsService } from '@application/services/versions.service';
import { VersionsDomainService } from '@domain/services/versions-domain.service';

describe('VersionsService', () => {
  let service: VersionsService;
  let resumeRepository: any;
  let versionRepository: any;
  let analysisRepository: any;

  const userId = 'auth-1';

  const resumes = [
    { id: 'resume-1', userId, title: 'Backend CV', latestVersionNumber: 2 },
    { id: 'resume-2', userId, title: 'Data CV', latestVersionNumber: 1 },
  ];

  const versions = [
    {
      id: 'version-3',
      resumeId: 'resume-2',
      versionNumber: 1,
      label: 'V1',
      sourceType: 'upload',
      parentVersionId: null,
      latestAnalysisId: 'analysis-3',
      createdAt: new Date('2026-01-04T10:00:00Z'),
    },
    {
      id: 'version-2',
      resumeId: 'resume-1',
      versionNumber: 2,
      label: 'V2',
      sourceType: 'rewrite',
      parentVersionId: 'version-1',
      latestAnalysisId: 'analysis-2',
      createdAt: new Date('2026-01-03T10:00:00Z'),
    },
    {
      id: 'version-1',
      resumeId: 'resume-1',
      versionNumber: 1,
      label: 'V1',
      sourceType: 'upload',
      parentVersionId: null,
      latestAnalysisId: null,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    },
  ];

  const stats = [
    {
      id: 'analysis-3',
      resumeId: 'resume-2',
      versionId: 'version-3',
      atsScore: 66,
    },
    {
      id: 'analysis-2',
      resumeId: 'resume-1',
      versionId: 'version-2',
      atsScore: 82,
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
      findStatsByIds: jest.fn().mockResolvedValue(stats),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionsService,
        VersionsDomainService,
        { provide: 'IResumeRepository', useValue: resumeRepository },
        { provide: 'IResumeVersionRepository', useValue: versionRepository },
        { provide: 'IAnalysisRepository', useValue: analysisRepository },
        {
          provide: LoggerService,
          useValue: { logger: jest.fn(), warning: jest.fn(), err: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<VersionsService>(VersionsService);
  });

  describe('getAll', () => {
    it('lists every version of every resume of the user', async () => {
      const result = await service.getAll(userId);

      expect(result.versions).toHaveLength(3);
      expect(result.versions.map((version) => version.id)).toEqual([
        'version-3',
        'version-2',
        'version-1',
      ]);
      expect(resumeRepository.findAllByUserId).toHaveBeenCalledWith(userId);
    });

    it('scopes the versions to the resumes the user still owns', async () => {
      await service.getAll(userId);

      expect(versionRepository.findAllByResumeIds).toHaveBeenCalledWith([
        'resume-1',
        'resume-2',
      ]);
    });

    it('resolves the scores of every analyzed version in one query', async () => {
      const result = await service.getAll(userId);

      expect(analysisRepository.findStatsByIds).toHaveBeenCalledTimes(1);
      expect(analysisRepository.findStatsByIds).toHaveBeenCalledWith([
        'analysis-3',
        'analysis-2',
      ]);
      expect(result.versions.map((version) => version.score)).toEqual([
        66,
        82,
        null,
      ]);
    });

    it('carries the title of the resume each version came from', async () => {
      const result = await service.getAll(userId);

      expect(result.versions.map((version) => version.resumeTitle)).toEqual([
        'Data CV',
        'Backend CV',
        'Backend CV',
      ]);
    });

    it('counts the totals per source type', async () => {
      const result = await service.getAll(userId);

      expect(result.totals).toEqual({ all: 3, uploads: 2, rewrites: 1 });
    });

    it('keeps the shape for a user with no resumes', async () => {
      resumeRepository.findAllByUserId.mockResolvedValue([]);
      versionRepository.findAllByResumeIds.mockResolvedValue([]);
      analysisRepository.findStatsByIds.mockResolvedValue([]);

      const result = await service.getAll(userId);

      expect(result.versions).toEqual([]);
      expect(result.totals).toEqual({ all: 0, uploads: 0, rewrites: 0 });
    });
  });
});

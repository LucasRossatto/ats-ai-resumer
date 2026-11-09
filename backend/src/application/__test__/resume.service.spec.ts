import {
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { PARSE_DAILY_LIMIT } from '@constants';
import { MAX_RESUME_CHARS } from '@infrastructure/ai/prompt-safety';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeService } from '@application/services/resume.service';
import { DiffService } from '@application/services/diff.service';
import { LoggerService } from '@application/services/logger.service';
import { UploadService } from '@application/services/upload.service';
import { StructuredParserService } from '@infrastructure/ai/structured-parser.service';
import { ResumeDomainService } from '@domain/services/resume-domain.service';

describe('ResumeService', () => {
  let service: ResumeService;
  let resumeRepository: any;
  let versionRepository: any;
  let analysisRepository: any;
  let uploadService: any;
  let structuredParserService: any;

  const userId = 'auth-1';
  const otherUserId = 'auth-2';

  beforeEach(async () => {
    resumeRepository = {
      create: jest.fn((resume) => Promise.resolve(resume)),
      findByIdAndUserId: jest.fn(),
      findAllByUserId: jest.fn().mockResolvedValue([]),
      update: jest.fn((id, data) => Promise.resolve({ id, ...data })),
      delete: jest.fn().mockResolvedValue(undefined),
      countByUserSince: jest.fn().mockResolvedValue(0),
      findIdsByUserId: jest.fn().mockResolvedValue(['resume-1', 'resume-2']),
      deleteByUserId: jest.fn().mockResolvedValue(undefined),
    };

    versionRepository = {
      create: jest.fn((version) => Promise.resolve(version)),
      countByResumeIdSince: jest.fn().mockResolvedValue(0),
      countRewritesSince: jest.fn().mockResolvedValue(0),
      deleteByResumeIds: jest.fn().mockResolvedValue(undefined),
      findByResumeId: jest.fn().mockResolvedValue([]),
      findByIdAndResumeId: jest.fn(),
    };

    analysisRepository = {
      deleteByResumeId: jest.fn().mockResolvedValue(undefined),
      deleteByUserId: jest.fn().mockResolvedValue(undefined),
      findByIdAndResumeId: jest.fn(),
      findAllStatsByUserId: jest.fn().mockResolvedValue([]),
      findStatsByIds: jest.fn().mockResolvedValue([]),
    };

    uploadService = {
      extractPdf: jest
        .fn()
        .mockResolvedValue({ text: 'raw resume text', meta: { numPages: 2 } }),
    };

    structuredParserService = {
      parseResume: jest.fn().mockResolvedValue({ summary: 'parsed' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeService,
        ResumeDomainService,
        DiffService,
        { provide: 'IResumeRepository', useValue: resumeRepository },
        { provide: 'IResumeVersionRepository', useValue: versionRepository },
        { provide: 'IAnalysisRepository', useValue: analysisRepository },
        { provide: UploadService, useValue: uploadService },
        {
          provide: StructuredParserService,
          useValue: structuredParserService,
        },
        {
          provide: LoggerService,
          useValue: { logger: jest.fn(), warning: jest.fn(), err: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ResumeService>(ResumeService);
  });

  describe('createFromUpload', () => {
    const file = {
      originalname: 'Lucas CV.pdf',
      buffer: Buffer.from('%PDF-'),
    } as Express.Multer.File;

    it('rejects with 429 and skips Gemini once the daily limit is reached', async () => {
      resumeRepository.countByUserSince.mockResolvedValue(PARSE_DAILY_LIMIT);

      await expect(
        service.createFromUpload(file, undefined, userId),
      ).rejects.toMatchObject({ status: 429 });
      await expect(
        service.createFromUpload(file, undefined, userId),
      ).rejects.toBeInstanceOf(HttpException);

      expect(structuredParserService.parseResume).not.toHaveBeenCalled();
      expect(resumeRepository.create).not.toHaveBeenCalled();
    });

    it('extracts, parses and persists resume plus V1', async () => {
      const result = await service.createFromUpload(file, undefined, userId);

      expect(uploadService.extractPdf).toHaveBeenCalledWith(file);
      expect(structuredParserService.parseResume).toHaveBeenCalledWith(
        'raw resume text',
      );

      expect(versionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          versionNumber: 1,
          label: 'V1',
          rawText: 'raw resume text',
          parsedSections: { summary: 'parsed' },
          sourceType: 'upload',
        }),
      );

      expect(result.meta).toEqual({ numPages: 2 });
    });

    it('titles the resume after the file when no title is sent', async () => {
      await service.createFromUpload(file, undefined, userId);

      expect(resumeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Lucas CV', userId }),
      );
    });

    it('points the resume at the version it just created', async () => {
      const result = await service.createFromUpload(file, 'My CV', userId);
      const createdVersionId = versionRepository.create.mock.calls[0][0].id;

      expect(resumeRepository.update).toHaveBeenCalledWith(expect.any(String), {
        currentVersionId: createdVersionId,
      });
      expect(result.resume.currentVersionId).toBe(createdVersionId);
    });
  });

  describe('findAllByUser', () => {
    const resume = {
      id: 'resume-1',
      userId,
      title: 'Backend CV',
      currentVersionId: 'version-2',
      latestVersionNumber: 2,
    };

    it('carries the best score each resume ever reached', async () => {
      resumeRepository.findAllByUserId.mockResolvedValue([resume]);
      analysisRepository.findAllStatsByUserId.mockResolvedValue([
        {
          id: 'a-1',
          resumeId: 'resume-1',
          versionId: 'version-1',
          atsScore: 88,
        },
        {
          id: 'a-2',
          resumeId: 'resume-1',
          versionId: 'version-2',
          atsScore: 71,
        },
      ]);

      const resumes = await service.findAllByUser(userId);

      expect(resumes).toHaveLength(1);
      expect(resumes[0]).toMatchObject({
        id: 'resume-1',
        latestVersionNumber: 2,
        bestScore: 88,
      });
    });

    it('reports a null score for a resume nobody analyzed', async () => {
      resumeRepository.findAllByUserId.mockResolvedValue([resume]);

      const resumes = await service.findAllByUser(userId);

      expect(resumes[0].bestScore).toBeNull();
    });

    it('reads the whole history in a single query', async () => {
      resumeRepository.findAllByUserId.mockResolvedValue([resume]);

      await service.findAllByUser(userId);

      expect(analysisRepository.findAllStatsByUserId).toHaveBeenCalledTimes(1);
      expect(analysisRepository.findAllStatsByUserId).toHaveBeenCalledWith(
        userId,
      );
    });
  });

  describe('findByIdWithVersions', () => {
    const versions = [
      { id: 'version-1', label: 'V1', latestAnalysisId: 'analysis-1' },
      { id: 'version-2', label: 'V2', latestAnalysisId: null },
    ];

    beforeEach(() => {
      resumeRepository.findByIdAndUserId.mockResolvedValue({ id: 'resume-1' });
      versionRepository.findByResumeId.mockResolvedValue(versions);
    });

    it('scores each version from its latest analysis', async () => {
      analysisRepository.findStatsByIds.mockResolvedValue([
        { id: 'analysis-1', versionId: 'version-1', atsScore: 64 },
      ]);

      const result = await service.findByIdWithVersions('resume-1', userId);

      expect(result.versions.map((version) => version.score)).toEqual([
        64,
        null,
      ]);
    });

    it('scores every version in a single lookup, never one per version', async () => {
      await service.findByIdWithVersions('resume-1', userId);

      expect(analysisRepository.findStatsByIds).toHaveBeenCalledTimes(1);
      expect(analysisRepository.findStatsByIds).toHaveBeenCalledWith([
        'analysis-1',
      ]);
    });
  });

  describe('ownership', () => {
    it('404s when the resume belongs to another user', async () => {
      resumeRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.findByIdWithVersions('resume-1', otherUserId),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(resumeRepository.findByIdAndUserId).toHaveBeenCalledWith(
        'resume-1',
        otherUserId,
      );
    });

    it('404s on delete of a resume the user does not own', async () => {
      resumeRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.delete('resume-1', otherUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(resumeRepository.delete).not.toHaveBeenCalled();
      expect(analysisRepository.deleteByResumeId).not.toHaveBeenCalled();
    });

    it('cascades the delete to the analyses of the resume', async () => {
      resumeRepository.findByIdAndUserId.mockResolvedValue({ id: 'resume-1' });

      await service.delete('resume-1', userId);

      expect(resumeRepository.delete).toHaveBeenCalledWith('resume-1');
      expect(analysisRepository.deleteByResumeId).toHaveBeenCalledWith(
        'resume-1',
      );
    });
  });

  describe('findVersion', () => {
    it('404s when the version is not part of the resume', async () => {
      resumeRepository.findByIdAndUserId.mockResolvedValue({ id: 'resume-1' });
      versionRepository.findByIdAndResumeId.mockResolvedValue(null);

      await expect(
        service.findVersion('resume-1', 'version-9', userId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the version scoped to the resume', async () => {
      resumeRepository.findByIdAndUserId.mockResolvedValue({ id: 'resume-1' });
      versionRepository.findByIdAndResumeId.mockResolvedValue({
        id: 'version-1',
      });

      const version = await service.findVersion(
        'resume-1',
        'version-1',
        userId,
      );

      expect(version).toEqual({ id: 'version-1' });
      expect(versionRepository.findByIdAndResumeId).toHaveBeenCalledWith(
        'version-1',
        'resume-1',
      );
    });
  });

  describe('applyRewrites', () => {
    const rewrites = [
      { original: 'Worked on the API', rewritten: 'Shipped 12 API endpoints' },
      { original: 'Helped the team', rewritten: 'Led a team of 4 engineers' },
    ];

    const baseVersion = {
      id: 'version-1',
      rawText: 'Worked on the API\nHelped the team',
      parsedSections: {
        basics: { name: 'Lucas' },
        summary: 'Worked on the API',
      },
    };

    beforeEach(() => {
      resumeRepository.findByIdAndUserId.mockResolvedValue({
        id: 'resume-1',
        latestVersionNumber: 1,
      });
      analysisRepository.findByIdAndResumeId.mockResolvedValue({
        id: 'analysis-1',
        versionId: 'version-1',
        bulletRewrites: rewrites,
      });
      versionRepository.findByIdAndResumeId.mockResolvedValue(baseVersion);
      structuredParserService.parseResume.mockResolvedValue({
        basics: { name: 'Lucas' },
        summary: 'Shipped 12 API endpoints',
      });
    });

    it('keeps the patched sections and skips the re-parse past the prompt limit', async () => {
      versionRepository.findByIdAndResumeId.mockResolvedValue({
        ...baseVersion,
        rawText: `${baseVersion.rawText}\n${'x'.repeat(MAX_RESUME_CHARS)}`,
      });

      await service.applyRewrites('resume-1', 'analysis-1', userId);

      expect(structuredParserService.parseResume).not.toHaveBeenCalled();
      expect(versionRepository.create).toHaveBeenCalled();
    });

    it('rejects with 429 and skips Gemini once the user hit the daily rewrite limit', async () => {
      versionRepository.countRewritesSince.mockResolvedValue(PARSE_DAILY_LIMIT);

      await expect(
        service.applyRewrites('resume-1', 'analysis-1', userId),
      ).rejects.toMatchObject({ status: 429 });

      expect(structuredParserService.parseResume).not.toHaveBeenCalled();
      expect(versionRepository.create).not.toHaveBeenCalled();
    });

    it('counts the rewrites of every resume of the user, not just this one', async () => {
      await service.applyRewrites('resume-1', 'analysis-1', userId);

      expect(resumeRepository.findIdsByUserId).toHaveBeenCalledWith(userId);
      expect(versionRepository.countRewritesSince).toHaveBeenCalledWith(
        ['resume-1', 'resume-2'],
        expect.any(Date),
      );
    });

    it('applies only the chosen rewrites', async () => {
      const result = await service.applyRewrites(
        'resume-1',
        'analysis-1',
        userId,
        [1],
      );

      expect(versionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rawText: 'Worked on the API\nLed a team of 4 engineers',
        }),
      );
      expect(result.appliedCount).toBe(1);
    });

    it.each([[[5]], [[]]])(
      '400s for an unknown or empty selection %p',
      async (indexes) => {
        await expect(
          service.applyRewrites('resume-1', 'analysis-1', userId, indexes),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(structuredParserService.parseResume).not.toHaveBeenCalled();
      },
    );

    it('400s before calling Gemini when no original is found in the text', async () => {
      versionRepository.findByIdAndResumeId.mockResolvedValue({
        ...baseVersion,
        rawText: 'Text that matches nothing',
      });

      await expect(
        service.applyRewrites('resume-1', 'analysis-1', userId),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(structuredParserService.parseResume).not.toHaveBeenCalled();
      expect(versionRepository.create).not.toHaveBeenCalled();
    });

    it('creates the next version from the analyzed one with the rewrites applied', async () => {
      const result = await service.applyRewrites(
        'resume-1',
        'analysis-1',
        userId,
      );

      expect(versionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          resumeId: 'resume-1',
          versionNumber: 2,
          label: 'V2',
          rawText: 'Shipped 12 API endpoints\nLed a team of 4 engineers',
          sourceType: 'rewrite',
          parentVersionId: 'version-1',
        }),
      );
      expect(result.appliedCount).toBe(2);
    });

    it('bases the rewrite on the analyzed version, not the current one', async () => {
      await service.applyRewrites('resume-1', 'analysis-1', userId);

      expect(versionRepository.findByIdAndResumeId).toHaveBeenCalledWith(
        'version-1',
        'resume-1',
      );
    });

    it('points the resume at the version it just created', async () => {
      const result = await service.applyRewrites(
        'resume-1',
        'analysis-1',
        userId,
      );

      expect(resumeRepository.update).toHaveBeenCalledWith('resume-1', {
        latestVersionNumber: 2,
        currentVersionId: result.version.id,
      });
    });

    it('falls back to the patched base sections when the re-parse comes back empty', async () => {
      structuredParserService.parseResume.mockResolvedValue({
        basics: {},
        summary: '',
      });

      await service.applyRewrites('resume-1', 'analysis-1', userId);

      expect(versionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parsedSections: expect.objectContaining({
            basics: { name: 'Lucas' },
            summary: 'Shipped 12 API endpoints',
          }),
        }),
      );
    });

    it('404s when the analysis does not belong to the resume', async () => {
      analysisRepository.findByIdAndResumeId.mockResolvedValue(null);

      await expect(
        service.applyRewrites('resume-1', 'analysis-9', userId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('400s when the analysis has no rewrites', async () => {
      analysisRepository.findByIdAndResumeId.mockResolvedValue({
        id: 'analysis-1',
        versionId: 'version-1',
        bulletRewrites: [],
      });

      await expect(
        service.applyRewrites('resume-1', 'analysis-1', userId),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(versionRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('purgeUser', () => {
    it('erases versions, analyses and resumes of the user, versions first', async () => {
      const order: string[] = [];
      versionRepository.deleteByResumeIds.mockImplementation(async () => {
        order.push('versions');
      });
      analysisRepository.deleteByUserId.mockImplementation(async () => {
        order.push('analyses');
      });
      resumeRepository.deleteByUserId.mockImplementation(async () => {
        order.push('resumes');
      });

      await service.purgeUser(userId);

      expect(versionRepository.deleteByResumeIds).toHaveBeenCalledWith([
        'resume-1',
        'resume-2',
      ]);
      expect(analysisRepository.deleteByUserId).toHaveBeenCalledWith(userId);
      expect(resumeRepository.deleteByUserId).toHaveBeenCalledWith(userId);
      expect(order).toEqual(['versions', 'analyses', 'resumes']);
    });
  });

  describe('diffVersions', () => {
    beforeEach(() => {
      resumeRepository.findByIdAndUserId.mockResolvedValue({ id: 'resume-1' });
      versionRepository.findByIdAndResumeId.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'version-1'
            ? {
                id: 'version-1',
                label: 'V1',
                versionNumber: 1,
                rawText: 'Worked on the API',
              }
            : {
                id: 'version-2',
                label: 'V2',
                versionNumber: 2,
                rawText: 'Shipped 12 API endpoints',
              },
        ),
      );
    });

    it('returns the parts, the stats and both version refs without rawText', async () => {
      const diff = await service.diffVersions(
        'resume-1',
        'version-1',
        'version-2',
        userId,
      );

      expect(diff.from).toEqual({
        id: 'version-1',
        label: 'V1',
        versionNumber: 1,
      });
      expect(diff.to).toEqual({
        id: 'version-2',
        label: 'V2',
        versionNumber: 2,
      });
      expect(diff.parts.some((p) => p.added)).toBe(true);
      expect(diff.parts.some((p) => p.removed)).toBe(true);
      expect(diff.stats.added).toBeGreaterThan(0);
      expect(diff.stats.removed).toBeGreaterThan(0);
    });

    it('404s when one of the versions is not part of the resume', async () => {
      versionRepository.findByIdAndResumeId.mockResolvedValue(null);

      await expect(
        service.diffVersions('resume-1', 'version-1', 'version-9', userId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

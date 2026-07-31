import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeService } from '@application/services/resume.service';
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
    };

    versionRepository = {
      create: jest.fn((version) => Promise.resolve(version)),
      findByResumeId: jest.fn().mockResolvedValue([]),
      findByIdAndResumeId: jest.fn(),
    };

    analysisRepository = {
      deleteByResumeId: jest.fn().mockResolvedValue(undefined),
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

      expect(resumeRepository.update).toHaveBeenCalledWith(
        expect.any(String),
        { currentVersionId: createdVersionId },
      );
      expect(result.resume.currentVersionId).toBe(createdVersionId);
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

      await expect(service.delete('resume-1', otherUserId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
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
});

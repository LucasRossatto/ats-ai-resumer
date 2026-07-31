import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Resume } from '@domain/entities/Resume';
import { ResumeVersion } from '@domain/entities/ResumeVersion';
import { IAnalysisRepository } from '@domain/interfaces/repositories/analysis-repository.interface';
import { IResumeRepository } from '@domain/interfaces/repositories/resume-repository.interface';
import { IResumeVersionRepository } from '@domain/interfaces/repositories/resume-version-repository.interface';
import { ResumeDomainService } from '@domain/services/resume-domain.service';
import { LoggerService } from '@application/services/logger.service';
import { UploadService } from '@application/services/upload.service';
import { StructuredParserService } from '@infrastructure/ai/structured-parser.service';

export interface CreatedResume {
  resume: Resume;
  version: ResumeVersion;
  meta: { numPages: number };
}

export interface ResumeWithVersions {
  resume: Resume;
  versions: ResumeVersion[];
}

@Injectable()
export class ResumeService {
  constructor(
    @Inject('IResumeRepository')
    private readonly resumeRepository: IResumeRepository,
    @Inject('IResumeVersionRepository')
    private readonly versionRepository: IResumeVersionRepository,
    @Inject('IAnalysisRepository')
    private readonly analysisRepository: IAnalysisRepository,
    private readonly resumeDomainService: ResumeDomainService,
    private readonly uploadService: UploadService,
    private readonly structuredParserService: StructuredParserService,
    private readonly logger: LoggerService,
  ) {}

  async createFromUpload(
    file: Express.Multer.File,
    title: string | undefined,
    userId: string,
  ): Promise<CreatedResume> {
    const context = { module: 'ResumeService', method: 'createFromUpload' };

    const { text, meta } = await this.uploadService.extractPdf(file);
    const parsedSections = await this.structuredParserService.parseResume(text);

    const resolvedTitle = this.resumeDomainService.resolveTitle(
      title,
      file.originalname,
    );

    const resume = await this.resumeRepository.create(
      this.resumeDomainService.createResumeEntity(userId, resolvedTitle),
    );

    const version = await this.versionRepository.create(
      this.resumeDomainService.createFirstVersionEntity(
        resume.id,
        text,
        parsedSections,
      ),
    );

    const resumeWithVersion = await this.resumeRepository.update(resume.id, {
      currentVersionId: version.id,
    });

    this.logger.logger(
      `Resume created from upload - resume: ${resume.id}, version: ${version.id}`,
      context,
    );

    return { resume: resumeWithVersion, version, meta };
  }

  async findAllByUser(userId: string): Promise<Resume[]> {
    const context = { module: 'ResumeService', method: 'findAllByUser' };
    this.logger.logger(`Fetching resumes for user: ${userId}`, context);
    return this.resumeRepository.findAllByUserId(userId);
  }

  async findByIdWithVersions(
    id: string,
    userId: string,
  ): Promise<ResumeWithVersions> {
    const resume = await this.loadOwnedResume(id, userId);
    const versions = await this.versionRepository.findByResumeId(resume.id);

    return { resume, versions };
  }

  async findVersion(
    resumeId: string,
    versionId: string,
    userId: string,
  ): Promise<ResumeVersion> {
    const resume = await this.loadOwnedResume(resumeId, userId);

    const version = await this.versionRepository.findByIdAndResumeId(
      versionId,
      resume.id,
    );

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return version;
  }

  async delete(id: string, userId: string): Promise<void> {
    const context = { module: 'ResumeService', method: 'delete' };

    const resume = await this.loadOwnedResume(id, userId);
    await this.resumeRepository.delete(resume.id);
    await this.analysisRepository.deleteByResumeId(resume.id);

    this.logger.logger(
      `Resume deleted with its analyses - resume: ${resume.id}`,
      context,
    );
  }

  /**
   * Ownership check for every resume-scoped route: a resume that belongs to
   * another user is indistinguishable from one that does not exist.
   */
  private async loadOwnedResume(id: string, userId: string): Promise<Resume> {
    const resume = await this.resumeRepository.findByIdAndUserId(id, userId);

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }
}

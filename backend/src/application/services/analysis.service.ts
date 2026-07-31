import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Analysis } from '@domain/entities/Analysis';
import { Resume } from '@domain/entities/Resume';
import { IAnalysisRepository } from '@domain/interfaces/repositories/analysis-repository.interface';
import { IResumeRepository } from '@domain/interfaces/repositories/resume-repository.interface';
import { IResumeVersionRepository } from '@domain/interfaces/repositories/resume-version-repository.interface';
import { AnalysisDomainService } from '@domain/services/analysis-domain.service';
import { LoggerService } from '@application/services/logger.service';
import { AnalysisGeneratorService } from '@infrastructure/ai/analysis-generator.service';

export interface AnalyzeOptions {
  targetRole?: string;
  versionId?: string;
}

@Injectable()
export class AnalysisService {
  constructor(
    @Inject('IAnalysisRepository')
    private readonly analysisRepository: IAnalysisRepository,
    @Inject('IResumeRepository')
    private readonly resumeRepository: IResumeRepository,
    @Inject('IResumeVersionRepository')
    private readonly versionRepository: IResumeVersionRepository,
    private readonly analysisDomainService: AnalysisDomainService,
    private readonly analysisGeneratorService: AnalysisGeneratorService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Runs the model over a resume version and stores the result. Defaults to the
   * current version, which is what the UI analyzes right after an upload.
   */
  async analyzeResume(
    resumeId: string,
    userId: string,
    options: AnalyzeOptions = {},
  ): Promise<Analysis> {
    const context = { module: 'AnalysisService', method: 'analyzeResume' };

    const resume = await this.loadOwnedResume(resumeId, userId);

    const versionId = options.versionId || resume.currentVersionId;

    if (!versionId) {
      throw new NotFoundException('Resume has no version to analyze');
    }

    const version = await this.versionRepository.findByIdAndResumeId(
      versionId,
      resume.id,
    );

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    const generated = await this.analysisGeneratorService.analyze({
      rawText: version.rawText,
      targetRole: options.targetRole,
    });

    const analysis = await this.analysisRepository.create(
      this.analysisDomainService.createAnalysisEntity(
        userId,
        resume.id,
        version.id,
        generated,
      ),
    );

    await this.versionRepository.update(version.id, {
      latestAnalysisId: analysis.id,
    });

    this.logger.logger(
      `Analysis created - resume: ${resume.id}, version: ${version.id}, ` +
        `analysis: ${analysis.id}, score: ${analysis.atsScore}`,
      context,
    );

    return analysis;
  }

  /**
   * Full analysis history of a resume, most recent first.
   */
  async findAllByResume(resumeId: string, userId: string): Promise<Analysis[]> {
    const context = { module: 'AnalysisService', method: 'findAllByResume' };

    const resume = await this.loadOwnedResume(resumeId, userId);
    const analyses = await this.analysisRepository.findByResumeId(resume.id);

    this.logger.logger(
      `Analyses retrieved - resume: ${resume.id}, total: ${analyses.length}`,
      context,
    );

    return analyses;
  }

  /**
   * Latest analysis of a single version. A version can be analyzed more than
   * once, and the newest run is the one the UI shows.
   */
  async findLatestByVersion(
    resumeId: string,
    versionId: string,
    userId: string,
  ): Promise<Analysis> {
    const resume = await this.loadOwnedResume(resumeId, userId);

    const version = await this.versionRepository.findByIdAndResumeId(
      versionId,
      resume.id,
    );

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    const analysis = await this.analysisRepository.findLatestByVersionId(
      version.id,
    );

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    return analysis;
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

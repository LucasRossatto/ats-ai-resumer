import { Inject, Injectable } from '@nestjs/common';
import { AnalysisStat } from '@domain/entities/Analysis';
import { VersionList } from '@domain/entities/Version';
import { IAnalysisRepository } from '@domain/interfaces/repositories/analysis-repository.interface';
import { IResumeRepository } from '@domain/interfaces/repositories/resume-repository.interface';
import { IResumeVersionRepository } from '@domain/interfaces/repositories/resume-version-repository.interface';
import { VersionsDomainService } from '@domain/services/versions-domain.service';
import { LoggerService } from '@application/services/logger.service';

@Injectable()
export class VersionsService {
  constructor(
    @Inject('IResumeRepository')
    private readonly resumeRepository: IResumeRepository,
    @Inject('IResumeVersionRepository')
    private readonly versionRepository: IResumeVersionRepository,
    @Inject('IAnalysisRepository')
    private readonly analysisRepository: IAnalysisRepository,
    private readonly versionsDomainService: VersionsDomainService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Every version the user ever produced, newest first, across all resumes.
   * Ownership comes from the resumes: only versions of resumes the user still
   * owns are reachable, so a soft deleted resume takes its history with it.
   *
   * The scores are fetched in one query over the analyses the versions already
   * point at, never one lookup per version.
   */
  async getAll(userId: string): Promise<VersionList> {
    const context = { module: 'VersionsService', method: 'getAll' };

    const resumes = await this.resumeRepository.findAllByUserId(userId);
    const resumeIds = resumes.map((resume) => resume.id);

    const versions = await this.versionRepository.findAllByResumeIds(resumeIds);

    const analysisIds = versions
      .map((version) => version.latestAnalysisId)
      .filter((id): id is string => !!id);

    const stats = await this.analysisRepository.findStatsByIds(analysisIds);

    const items = this.versionsDomainService.buildItems(
      versions,
      resumes,
      this.toScoreByVersionId(stats),
    );
    const totals = this.versionsDomainService.buildTotals(items);

    this.logger.logger(
      `Versions retrieved - user: ${userId}, resumes: ${resumes.length}, ` +
        `versions: ${totals.all}, uploads: ${totals.uploads}, rewrites: ${totals.rewrites}`,
      context,
    );

    return { versions: items, totals };
  }

  private toScoreByVersionId(stats: AnalysisStat[]): Map<string, number> {
    return new Map(stats.map((stat) => [stat.versionId, stat.atsScore]));
  }
}

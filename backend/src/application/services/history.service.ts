import { Inject, Injectable } from '@nestjs/common';
import { History } from '@domain/entities/History';
import { IAnalysisRepository } from '@domain/interfaces/repositories/analysis-repository.interface';
import { IResumeRepository } from '@domain/interfaces/repositories/resume-repository.interface';
import { IResumeVersionRepository } from '@domain/interfaces/repositories/resume-version-repository.interface';
import { HistoryDomainService } from '@domain/services/history-domain.service';
import { LoggerService } from '@application/services/logger.service';

@Injectable()
export class HistoryService {
  constructor(
    @Inject('IResumeRepository')
    private readonly resumeRepository: IResumeRepository,
    @Inject('IResumeVersionRepository')
    private readonly versionRepository: IResumeVersionRepository,
    @Inject('IAnalysisRepository')
    private readonly analysisRepository: IAnalysisRepository,
    private readonly historyDomainService: HistoryDomainService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * The whole activity timeline of a user: uploads, rewrites and analyses in
   * one list, newest first. The resumes are read first because both other
   * queries hang off them, then the versions and the analyses go together.
   *
   * Soft deleted resumes drop out of all three: the versions are scoped to the
   * resumes that survive, and the delete cascade already marked their analyses.
   */
  async getAll(userId: string): Promise<History> {
    const context = { module: 'HistoryService', method: 'getAll' };

    const resumes = await this.resumeRepository.findAllByUserId(userId);
    const resumeIds = resumes.map((resume) => resume.id);

    const [versions, analyses] = await Promise.all([
      this.versionRepository.findAllByResumeIds(resumeIds),
      this.analysisRepository.findAllStatsByUserId(userId),
    ]);

    const events = this.historyDomainService.buildEvents(
      resumes,
      versions,
      analyses,
    );
    const totals = this.historyDomainService.buildTotals(events);

    this.logger.logger(
      `History retrieved - user: ${userId}, events: ${totals.all}, ` +
        `uploads: ${totals.upload}, analyses: ${totals.analyze}, rewrites: ${totals.rewrite}`,
      context,
    );

    return { events, totals };
  }
}

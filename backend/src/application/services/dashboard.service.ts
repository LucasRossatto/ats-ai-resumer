import { Inject, Injectable } from '@nestjs/common';
import { AnalysisStat } from '@domain/entities/Analysis';
import { DashboardOverview } from '@domain/entities/Dashboard';
import { Resume } from '@domain/entities/Resume';
import { IAnalysisRepository } from '@domain/interfaces/repositories/analysis-repository.interface';
import { IResumeRepository } from '@domain/interfaces/repositories/resume-repository.interface';
import { IResumeVersionRepository } from '@domain/interfaces/repositories/resume-version-repository.interface';
import { DashboardDomainService } from '@domain/services/dashboard-domain.service';
import { LoggerService } from '@application/services/logger.service';

/**
 * How much recent history the panels need. Both feed short lists, so the
 * queries stay bounded no matter how long the user has been on the product.
 */
const ANALYSIS_HISTORY_LIMIT = 10;
const RECENT_VERSIONS_LIMIT = 10;

@Injectable()
export class DashboardService {
  constructor(
    @Inject('IResumeRepository')
    private readonly resumeRepository: IResumeRepository,
    @Inject('IResumeVersionRepository')
    private readonly versionRepository: IResumeVersionRepository,
    @Inject('IAnalysisRepository')
    private readonly analysisRepository: IAnalysisRepository,
    private readonly dashboardDomainService: DashboardDomainService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Everything the dashboard draws in a single read: totals, the resume the
   * user touched last with its score history, the headline cards and the
   * activity feed. A user with no resumes gets the same shape with empty
   * panels, never a 404.
   */
  async getOverview(userId: string): Promise<DashboardOverview> {
    const context = { module: 'DashboardService', method: 'getOverview' };

    const resumes = await this.resumeRepository.findAllByUserId(userId);
    const resumeIds = resumes.map((resume) => resume.id);

    const [rewriteCount, analysisCount, recentStats, recentVersions] =
      await Promise.all([
        this.versionRepository.countByResumeIdsAndSourceType(
          resumeIds,
          'rewrite',
        ),
        this.analysisRepository.countByUserId(userId),
        this.analysisRepository.findStatsByUserId(
          userId,
          ANALYSIS_HISTORY_LIMIT,
        ),
        this.versionRepository.findRecentByResumeIds(
          resumeIds,
          RECENT_VERSIONS_LIMIT,
        ),
      ]);

    /**
     * The repository answers newest first, which is what the activity feed
     * wants; the KPI cards read a timeline, so they get it the other way round.
     */
    const statsOldestFirst = [...recentStats].reverse();

    const { latestResume, scoreSeries, versionStack } =
      await this.buildLatestResumePanels(resumes[0]);

    const overview: DashboardOverview = {
      totals: {
        resumes: resumes.length,
        rewrites: rewriteCount,
        analyses: analysisCount,
      },
      latestResume,
      scoreSeries,
      versionStack,
      kpi: this.dashboardDomainService.buildKpi(resumes, statsOldestFirst),
      activity: this.dashboardDomainService.buildActivity(
        resumes,
        recentVersions,
        recentStats,
      ),
    };

    this.logger.logger(
      `Dashboard overview retrieved - user: ${userId}, resumes: ${resumes.length}, ` +
        `analyses: ${analysisCount}, rewrites: ${rewriteCount}`,
      context,
    );

    return overview;
  }

  /**
   * The panels scoped to the most recently updated resume: its version history
   * and the score each version reached.
   */
  private async buildLatestResumePanels(
    latest: Resume | undefined,
  ): Promise<
    Pick<DashboardOverview, 'latestResume' | 'scoreSeries' | 'versionStack'>
  > {
    if (!latest) {
      return { latestResume: null, scoreSeries: [], versionStack: [] };
    }

    const versions = await this.versionRepository.findByResumeId(latest.id);

    const analysisIds = versions
      .map((version) => version.latestAnalysisId)
      .filter((id): id is string => !!id);

    const stats = await this.analysisRepository.findStatsByIds(analysisIds);
    const scoreByVersionId = this.toScoreByVersionId(stats);

    return {
      latestResume: this.dashboardDomainService.toResumeRef(latest),
      scoreSeries: this.dashboardDomainService.buildScoreSeries(
        versions,
        scoreByVersionId,
      ),
      versionStack: this.dashboardDomainService.buildVersionStack(
        versions,
        scoreByVersionId,
      ),
    };
  }

  private toScoreByVersionId(stats: AnalysisStat[]): Map<string, number> {
    return new Map(stats.map((stat) => [stat.versionId, stat.atsScore]));
  }
}

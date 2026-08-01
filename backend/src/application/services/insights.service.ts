import { Inject, Injectable } from '@nestjs/common';
import { InsightsOverview } from '@domain/entities/Insights';
import { IAnalysisRepository } from '@domain/interfaces/repositories/analysis-repository.interface';
import { IResumeRepository } from '@domain/interfaces/repositories/resume-repository.interface';
import { InsightsDomainService } from '@domain/services/insights-domain.service';
import { LoggerService } from '@application/services/logger.service';

@Injectable()
export class InsightsService {
  constructor(
    @Inject('IResumeRepository')
    private readonly resumeRepository: IResumeRepository,
    @Inject('IAnalysisRepository')
    private readonly analysisRepository: IAnalysisRepository,
    private readonly insightsDomainService: InsightsDomainService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * What the whole analysis history of a user adds up to: the score trend, the
   * problems and keywords that keep repeating, and how each resume is doing.
   * A user with resumes but no analyses gets `empty: true` with the resume list
   * still filled, which is what the onboarding panel offers to analyze.
   */
  async getOverview(userId: string): Promise<InsightsOverview> {
    const context = { module: 'InsightsService', method: 'getOverview' };

    const [resumes, analyses] = await Promise.all([
      this.resumeRepository.findAllByUserId(userId),
      this.analysisRepository.findInsightsByUserId(userId),
    ]);

    const overview: InsightsOverview = {
      empty: !analyses.length,
      totalAnalyses: analyses.length,
      averageScore: this.insightsDomainService.averageScore(analyses),
      bestScore: this.insightsDomainService.bestScore(analyses, resumes),
      resumes: resumes.map((resume) =>
        this.insightsDomainService.toResumeRef(resume),
      ),
      scoreTrend: this.insightsDomainService.buildScoreTrend(analyses, resumes),
      topIssues: this.insightsDomainService.buildTopIssues(analyses),
      topMissingKeywords:
        this.insightsDomainService.buildTopMissingKeywords(analyses),
      topPresentKeywords:
        this.insightsDomainService.buildTopPresentKeywords(analyses),
      resumePerformance: this.insightsDomainService.buildResumePerformance(
        resumes,
        analyses,
      ),
    };

    this.logger.logger(
      `Insights retrieved - user: ${userId}, resumes: ${resumes.length}, ` +
        `analyses: ${analyses.length}, average: ${overview.averageScore}`,
      context,
    );

    return overview;
  }
}

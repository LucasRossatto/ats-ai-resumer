import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { ANALYSIS_MODEL_PROVIDER } from '@constants';
import {
  Analysis,
  AnalysisInsight,
  AnalysisStat,
} from '@domain/entities/Analysis';
import { IAnalysisRepository } from '@domain/interfaces/repositories/analysis-repository.interface';
import { Analysis as AnalysisDocument } from '@infrastructure/models/analysis.model';

const STAT_FIELDS =
  'id resumeId versionId atsScore issues keywordsPresent keywordsMissing createdAt';

/**
 * Same columns as the stats: the aggregations need the lists, never the
 * rewrites or the prose, which are the bulk of an analysis document.
 */
const INSIGHT_FIELDS = STAT_FIELDS;

@Injectable()
export class AnalysisRepository implements IAnalysisRepository {
  constructor(
    @Inject(ANALYSIS_MODEL_PROVIDER)
    private readonly analysisModel: Model<AnalysisDocument>,
  ) {}

  async create(analysis: Partial<Analysis>): Promise<Analysis> {
    const newAnalysis = new this.analysisModel(analysis);
    const savedAnalysis = await newAnalysis.save();
    return savedAnalysis.toObject() as Analysis;
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Analysis | null> {
    const analysis = await this.analysisModel
      .findOne({ id, userId, deletedAt: null })
      .exec();
    return analysis ? (analysis.toObject() as Analysis) : null;
  }

  async findByIdAndResumeId(
    id: string,
    resumeId: string,
  ): Promise<Analysis | null> {
    const analysis = await this.analysisModel
      .findOne({ id, resumeId, deletedAt: null })
      .exec();
    return analysis ? (analysis.toObject() as Analysis) : null;
  }

  async findLatestByVersionId(versionId: string): Promise<Analysis | null> {
    const analysis = await this.analysisModel
      .findOne({ versionId, deletedAt: null })
      .sort({ createdAt: -1 })
      .exec();
    return analysis ? (analysis.toObject() as Analysis) : null;
  }

  async findByResumeId(resumeId: string): Promise<Analysis[]> {
    const analyses = await this.analysisModel
      .find({ resumeId, deletedAt: null })
      .sort({ createdAt: -1 })
      .exec();
    return analyses.map((analysis) => analysis.toObject() as Analysis);
  }

  async countByUserId(userId: string): Promise<number> {
    return this.analysisModel
      .countDocuments({ userId, deletedAt: null })
      .exec();
  }

  async findStatsByUserId(
    userId: string,
    limit: number,
  ): Promise<AnalysisStat[]> {
    const analyses = await this.analysisModel
      .find({ userId, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(STAT_FIELDS)
      .exec();
    return analyses.map((analysis) => this.toStat(analysis));
  }

  async findStatsByIds(ids: string[]): Promise<AnalysisStat[]> {
    if (!ids.length) {
      return [];
    }

    const analyses = await this.analysisModel
      .find({ id: { $in: ids }, deletedAt: null })
      .select(STAT_FIELDS)
      .exec();
    return analyses.map((analysis) => this.toStat(analysis));
  }

  async findInsightsByUserId(userId: string): Promise<AnalysisInsight[]> {
    const analyses = await this.analysisModel
      .find({ userId, deletedAt: null })
      .sort({ createdAt: 1 })
      .select(INSIGHT_FIELDS)
      .exec();

    return analyses.map((analysis) => ({
      id: analysis.id,
      resumeId: analysis.resumeId,
      versionId: analysis.versionId,
      atsScore: analysis.atsScore,
      issues: analysis.issues || [],
      keywordsPresent: analysis.keywordsPresent || [],
      keywordsMissing: analysis.keywordsMissing || [],
      createdAt: analysis.createdAt,
    }));
  }

  async deleteByResumeId(resumeId: string): Promise<void> {
    await this.analysisModel
      .updateMany(
        { resumeId, deletedAt: null },
        { $set: { deletedAt: new Date() } },
      )
      .exec();
  }

  /**
   * Collapses the analysis lists into the counts the dashboard charts, so the
   * arrays themselves never leave the repository.
   */
  private toStat(analysis: AnalysisDocument): AnalysisStat {
    return {
      id: analysis.id,
      resumeId: analysis.resumeId,
      versionId: analysis.versionId,
      atsScore: analysis.atsScore,
      issuesCount: analysis.issues?.length || 0,
      keywordsPresentCount: analysis.keywordsPresent?.length || 0,
      keywordsMissingCount: analysis.keywordsMissing?.length || 0,
      createdAt: analysis.createdAt,
    };
  }
}

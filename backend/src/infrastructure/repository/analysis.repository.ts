import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { ANALYSIS_MODEL_PROVIDER } from '@constants';
import { Analysis } from '@domain/entities/Analysis';
import { IAnalysisRepository } from '@domain/interfaces/repositories/analysis-repository.interface';
import { Analysis as AnalysisDocument } from '@infrastructure/models/analysis.model';

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

  async deleteByResumeId(resumeId: string): Promise<void> {
    await this.analysisModel
      .updateMany(
        { resumeId, deletedAt: null },
        { $set: { deletedAt: new Date() } },
      )
      .exec();
  }
}

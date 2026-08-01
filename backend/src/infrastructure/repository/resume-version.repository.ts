import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { RESUME_VERSION_MODEL_PROVIDER } from '@constants';
import {
  ResumeVersion,
  ResumeVersionSourceType,
} from '@domain/entities/ResumeVersion';
import { IResumeVersionRepository } from '@domain/interfaces/repositories/resume-version-repository.interface';
import { ResumeVersion as ResumeVersionDocument } from '@infrastructure/models/resume-version.model';

@Injectable()
export class ResumeVersionRepository implements IResumeVersionRepository {
  constructor(
    @Inject(RESUME_VERSION_MODEL_PROVIDER)
    private readonly resumeVersionModel: Model<ResumeVersionDocument>,
  ) {}

  async create(version: Partial<ResumeVersion>): Promise<ResumeVersion> {
    const newVersion = new this.resumeVersionModel(version);
    const savedVersion = await newVersion.save();
    return savedVersion.toObject() as ResumeVersion;
  }

  async findByResumeId(resumeId: string): Promise<ResumeVersion[]> {
    const versions = await this.resumeVersionModel
      .find({ resumeId })
      .sort({ versionNumber: 1 })
      .select('-rawText')
      .exec();
    return versions.map((version) => version.toObject() as ResumeVersion);
  }

  async findByIdAndResumeId(
    id: string,
    resumeId: string,
  ): Promise<ResumeVersion | null> {
    const version = await this.resumeVersionModel
      .findOne({ id, resumeId })
      .exec();
    return version ? (version.toObject() as ResumeVersion) : null;
  }

  async countByResumeIdsAndSourceType(
    resumeIds: string[],
    sourceType: ResumeVersionSourceType,
  ): Promise<number> {
    if (!resumeIds.length) {
      return 0;
    }

    return this.resumeVersionModel
      .countDocuments({ resumeId: { $in: resumeIds }, sourceType })
      .exec();
  }

  async findRecentByResumeIds(
    resumeIds: string[],
    limit: number,
  ): Promise<ResumeVersion[]> {
    if (!resumeIds.length) {
      return [];
    }

    const versions = await this.resumeVersionModel
      .find({ resumeId: { $in: resumeIds } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-rawText')
      .exec();
    return versions.map((version) => version.toObject() as ResumeVersion);
  }

  async update(
    id: string,
    versionData: Partial<ResumeVersion>,
  ): Promise<ResumeVersion> {
    const updatedVersion = await this.resumeVersionModel
      .findOneAndUpdate({ id }, { $set: versionData }, { new: true })
      .exec();

    if (!updatedVersion) {
      throw new Error('Resume version not found');
    }

    return updatedVersion.toObject() as ResumeVersion;
  }
}

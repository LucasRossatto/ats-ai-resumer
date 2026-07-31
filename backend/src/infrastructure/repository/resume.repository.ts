import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { RESUME_MODEL_PROVIDER } from '@constants';
import { Resume } from '@domain/entities/Resume';
import { IResumeRepository } from '@domain/interfaces/repositories/resume-repository.interface';
import { Resume as ResumeDocument } from '@infrastructure/models/resume.model';

@Injectable()
export class ResumeRepository implements IResumeRepository {
  constructor(
    @Inject(RESUME_MODEL_PROVIDER)
    private readonly resumeModel: Model<ResumeDocument>,
  ) {}

  async create(resume: Partial<Resume>): Promise<Resume> {
    const newResume = new this.resumeModel(resume);
    const savedResume = await newResume.save();
    return savedResume.toObject() as Resume;
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Resume | null> {
    const resume = await this.resumeModel
      .findOne({ id, userId, deletedAt: null })
      .exec();
    return resume ? (resume.toObject() as Resume) : null;
  }

  async findAllByUserId(userId: string): Promise<Resume[]> {
    const resumes = await this.resumeModel
      .find({ userId, deletedAt: null })
      .sort({ updatedAt: -1 })
      .exec();
    return resumes.map((resume) => resume.toObject() as Resume);
  }

  async update(id: string, resumeData: Partial<Resume>): Promise<Resume> {
    const updatedResume = await this.resumeModel
      .findOneAndUpdate(
        { id, deletedAt: null },
        { $set: resumeData },
        { new: true },
      )
      .exec();

    if (!updatedResume) {
      throw new Error('Resume not found');
    }

    return updatedResume.toObject() as Resume;
  }

  async delete(id: string): Promise<void> {
    await this.resumeModel
      .updateOne({ id, deletedAt: null }, { $set: { deletedAt: new Date() } })
      .exec();
  }
}

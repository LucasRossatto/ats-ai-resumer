import { Resume } from '@domain/entities/Resume';

export interface IResumeRepository {
  create(resume: Partial<Resume>): Promise<Resume>;
  findByIdAndUserId(id: string, userId: string): Promise<Resume | null>;
  findAllByUserId(userId: string): Promise<Resume[]>;
  update(id: string, resume: Partial<Resume>): Promise<Resume>;
  delete(id: string): Promise<void>;
}

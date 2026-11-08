import { Resume } from '@domain/entities/Resume';

export interface IResumeRepository {
  create(resume: Partial<Resume>): Promise<Resume>;
  findByIdAndUserId(id: string, userId: string): Promise<Resume | null>;
  findAllByUserId(userId: string): Promise<Resume[]>;
  update(id: string, resume: Partial<Resume>): Promise<Resume>;
  delete(id: string): Promise<void>;
  /**
   * Resumes a user created since a point in time, for the daily parse quota.
   * Soft-deleted ones still count, so deleting does not refill it.
   */
  countByUserSince(userId: string, since: Date): Promise<number>;
  /** Ids of every resume of a user, soft-deleted ones included. */
  findIdsByUserId(userId: string): Promise<string[]>;
}

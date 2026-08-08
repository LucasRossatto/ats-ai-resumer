import { v4 as uuidv4 } from 'uuid';
import { Analysis } from '@domain/entities/Analysis';

export interface AnalysisPayload {
  atsScore: number;
  scoreBreakdown: Analysis['scoreBreakdown'];
  issues: Analysis['issues'];
  strengths: Analysis['strengths'];
  bulletRewrites: Analysis['bulletRewrites'];
  keywordsPresent: string[];
  keywordsMissing: string[];
  summary: string;
  model: string;
  promptTokens: number;
}

export class AnalysisDomainService {
  /**
   * Business Logic: Generate analysis ID
   */
  generateAnalysisId(): string {
    return 'analysis-' + uuidv4();
  }

  /**
   * Business Logic: Assemble the analysis produced for a resume version
   */
  createAnalysisEntity(
    userId: string,
    resumeId: string,
    versionId: string,
    payload: AnalysisPayload,
  ): Partial<Analysis> {
    return {
      id: this.generateAnalysisId(),
      userId,
      resumeId,
      versionId,
      ...payload,
    };
  }
}

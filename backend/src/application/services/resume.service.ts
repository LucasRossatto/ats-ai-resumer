import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnalysisStat } from '@domain/entities/Analysis';
import { Resume, ResumeListItem } from '@domain/entities/Resume';
import {
  ResumeVersion,
  ResumeVersionDetail,
} from '@domain/entities/ResumeVersion';
import { IAnalysisRepository } from '@domain/interfaces/repositories/analysis-repository.interface';
import { IResumeRepository } from '@domain/interfaces/repositories/resume-repository.interface';
import { IResumeVersionRepository } from '@domain/interfaces/repositories/resume-version-repository.interface';
import { ResumeDomainService } from '@domain/services/resume-domain.service';
import {
  DiffMode,
  DiffPart,
  DiffService,
  DiffSummary,
} from '@application/services/diff.service';
import { LoggerService } from '@application/services/logger.service';
import { UploadService } from '@application/services/upload.service';
import { StructuredParserService } from '@infrastructure/ai/structured-parser.service';

export interface CreatedResume {
  resume: Resume;
  version: ResumeVersion;
  meta: { numPages: number };
}

export interface ResumeWithVersions {
  resume: Resume;
  versions: ResumeVersionDetail[];
}

export interface AppliedRewrites {
  version: ResumeVersion;
  appliedCount: number;
}

export interface VersionRef {
  id: string;
  label: string;
  versionNumber: number;
}

export interface VersionDiff {
  from: VersionRef;
  to: VersionRef;
  parts: DiffPart[];
  stats: DiffSummary;
}

@Injectable()
export class ResumeService {
  constructor(
    @Inject('IResumeRepository')
    private readonly resumeRepository: IResumeRepository,
    @Inject('IResumeVersionRepository')
    private readonly versionRepository: IResumeVersionRepository,
    @Inject('IAnalysisRepository')
    private readonly analysisRepository: IAnalysisRepository,
    private readonly resumeDomainService: ResumeDomainService,
    private readonly uploadService: UploadService,
    private readonly structuredParserService: StructuredParserService,
    private readonly diffService: DiffService,
    private readonly logger: LoggerService,
  ) {}

  async createFromUpload(
    file: Express.Multer.File,
    title: string | undefined,
    userId: string,
  ): Promise<CreatedResume> {
    const context = { module: 'ResumeService', method: 'createFromUpload' };

    const { text, meta } = await this.uploadService.extractPdf(file);
    const parsedSections = await this.structuredParserService.parseResume(text);

    const resolvedTitle = this.resumeDomainService.resolveTitle(
      title,
      file.originalname,
    );

    const resume = await this.resumeRepository.create(
      this.resumeDomainService.createResumeEntity(userId, resolvedTitle),
    );

    const version = await this.versionRepository.create(
      this.resumeDomainService.createFirstVersionEntity(
        resume.id,
        text,
        parsedSections,
      ),
    );

    const resumeWithVersion = await this.resumeRepository.update(resume.id, {
      currentVersionId: version.id,
    });

    this.logger.logger(
      `Resume created from upload - resume: ${resume.id}, version: ${version.id}`,
      context,
    );

    return { resume: resumeWithVersion, version, meta };
  }

  /**
   * The resume list with the best score each one ever reached. The scores come
   * from a single pass over the analysis history of the user, never one query
   * per resume.
   */
  async findAllByUser(userId: string): Promise<ResumeListItem[]> {
    const context = { module: 'ResumeService', method: 'findAllByUser' };

    const [resumes, stats] = await Promise.all([
      this.resumeRepository.findAllByUserId(userId),
      this.analysisRepository.findAllStatsByUserId(userId),
    ]);

    const items = this.resumeDomainService.buildListItems(resumes, stats);

    this.logger.logger(
      `Resumes retrieved - user: ${userId}, resumes: ${items.length}, ` +
        `analyses: ${stats.length}`,
      context,
    );

    return items;
  }

  /**
   * The resume with its versions, each scored by its latest analysis. The
   * scores are fetched in one query over the analyses the versions already
   * point at, the same shape `VersionsService` uses across resumes.
   */
  async findByIdWithVersions(
    id: string,
    userId: string,
  ): Promise<ResumeWithVersions> {
    const resume = await this.loadOwnedResume(id, userId);
    const versions = await this.versionRepository.findByResumeId(resume.id);

    const analysisIds = versions
      .map((version) => version.latestAnalysisId)
      .filter((analysisId): analysisId is string => !!analysisId);

    const stats = await this.analysisRepository.findStatsByIds(analysisIds);

    return {
      resume,
      versions: this.resumeDomainService.attachScores(
        versions,
        this.toScoreByVersionId(stats),
      ),
    };
  }

  async findVersion(
    resumeId: string,
    versionId: string,
    userId: string,
  ): Promise<ResumeVersion> {
    const resume = await this.loadOwnedResume(resumeId, userId);

    const version = await this.versionRepository.findByIdAndResumeId(
      versionId,
      resume.id,
    );

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return version;
  }

  /**
   * Applies the bullet rewrites of an analysis on top of the version it ran
   * against, producing the next version of the resume. The base is the
   * analyzed version, not the current one, so a rewrite never silently
   * reapplies to text the analysis never saw.
   */
  async applyRewrites(
    resumeId: string,
    analysisId: string,
    userId: string,
  ): Promise<AppliedRewrites> {
    const context = { module: 'ResumeService', method: 'applyRewrites' };

    const resume = await this.loadOwnedResume(resumeId, userId);

    const analysis = await this.analysisRepository.findByIdAndResumeId(
      analysisId,
      resume.id,
    );

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    const baseVersion = await this.versionRepository.findByIdAndResumeId(
      analysis.versionId,
      resume.id,
    );

    if (!baseVersion) {
      throw new NotFoundException('Version not found');
    }

    const rewrites = analysis.bulletRewrites || [];

    if (!rewrites.length) {
      throw new BadRequestException('Analysis has no rewrites to apply');
    }

    const rawText = this.resumeDomainService.applyRewritesToText(
      baseVersion.rawText,
      rewrites,
    );

    /**
     * Safety net: a structured copy of the base version with the rewritten
     * bullets swapped in, so the new version never lands with empty sections
     * when the re-parse of the rewritten text fails.
     */
    const patchedFromBase = this.resumeDomainService.patchBulletsInSections(
      baseVersion.parsedSections,
      rewrites,
    );
    const reparsed = await this.structuredParserService.parseResume(rawText);
    const parsedSections = this.resumeDomainService.looksEmpty(reparsed)
      ? patchedFromBase
      : reparsed;

    const nextNumber = resume.latestVersionNumber + 1;

    const version = await this.versionRepository.create(
      this.resumeDomainService.createRewriteVersionEntity(
        resume.id,
        nextNumber,
        rawText,
        parsedSections,
        baseVersion.id,
      ),
    );

    await this.resumeRepository.update(resume.id, {
      latestVersionNumber: nextNumber,
      currentVersionId: version.id,
    });

    this.logger.logger(
      `Rewrites applied - resume: ${resume.id}, analysis: ${analysis.id}, ` +
        `base: ${baseVersion.id}, version: ${version.id}, applied: ${rewrites.length}`,
      context,
    );

    return { version, appliedCount: rewrites.length };
  }

  /**
   * Text comparison between two versions of the same resume, used by the UI to
   * show what a round of rewrites actually changed.
   */
  async diffVersions(
    resumeId: string,
    fromId: string,
    toId: string,
    userId: string,
    mode: DiffMode = 'words',
  ): Promise<VersionDiff> {
    const resume = await this.loadOwnedResume(resumeId, userId);

    const [fromVersion, toVersion] = await Promise.all([
      this.versionRepository.findByIdAndResumeId(fromId, resume.id),
      this.versionRepository.findByIdAndResumeId(toId, resume.id),
    ]);

    if (!fromVersion || !toVersion) {
      throw new NotFoundException('Version not found');
    }

    const parts = this.diffService.diffText(
      fromVersion.rawText,
      toVersion.rawText,
      mode,
    );

    return {
      from: this.toVersionRef(fromVersion),
      to: this.toVersionRef(toVersion),
      parts,
      stats: this.diffService.summarize(parts),
    };
  }

  async delete(id: string, userId: string): Promise<void> {
    const context = { module: 'ResumeService', method: 'delete' };

    const resume = await this.loadOwnedResume(id, userId);
    await this.resumeRepository.delete(resume.id);
    await this.analysisRepository.deleteByResumeId(resume.id);

    this.logger.logger(
      `Resume deleted with its analyses - resume: ${resume.id}`,
      context,
    );
  }

  /**
   * Ownership check for every resume-scoped route: a resume that belongs to
   * another user is indistinguishable from one that does not exist.
   */
  private async loadOwnedResume(id: string, userId: string): Promise<Resume> {
    const resume = await this.resumeRepository.findByIdAndUserId(id, userId);

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }

  /**
   * Diff payloads carry only what the version picker needs, never rawText:
   * the text itself is already in the parts.
   */
  private toVersionRef(version: ResumeVersion): VersionRef {
    return {
      id: version.id,
      label: version.label,
      versionNumber: version.versionNumber,
    };
  }

  private toScoreByVersionId(stats: AnalysisStat[]): Map<string, number> {
    return new Map(stats.map((stat) => [stat.versionId, stat.atsScore]));
  }
}

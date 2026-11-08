import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PARSE_DAILY_LIMIT } from '@constants';
import { AnalysisStat, BulletRewrite } from '@domain/entities/Analysis';
import { Resume, ResumeListItem } from '@domain/entities/Resume';
import {
  ParsedSections,
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
import { QuotaReservations } from '@application/services/quota-reservations';
import { UploadService } from '@application/services/upload.service';
import { StructuredParserService } from '@infrastructure/ai/structured-parser.service';

function startOfUtcDay(): Date {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  return since;
}

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
  private readonly quota = new QuotaReservations();

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

    const release = this.reserveParseQuota(
      `upload:${userId}`,
      await this.resumeRepository.countByUserSince(userId, startOfUtcDay()),
    );

    const resolvedTitle = this.resumeDomainService.resolveTitle(
      title,
      file.originalname,
    );
    let parsedSections: ParsedSections;
    let resume: Resume;

    try {
      parsedSections = await this.structuredParserService.parseResume(text);
      resume = await this.resumeRepository.create(
        this.resumeDomainService.createResumeEntity(userId, resolvedTitle),
      );
    } finally {
      release();
    }

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
    rewriteIndexes?: number[],
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

    // Per user, not per resume: the cap would otherwise multiply by the number
    // of resumes the user can create in a day.
    const release = this.reserveParseQuota(
      `rewrite:${userId}`,
      await this.versionRepository.countRewritesSince(
        await this.resumeRepository.findIdsByUserId(userId),
        startOfUtcDay(),
      ),
    );

    try {
      const available = analysis.bulletRewrites || [];

      if (!available.length) {
        throw new BadRequestException('Analysis has no rewrites to apply');
      }

      const rewrites = this.pickRewrites(available, rewriteIndexes);
      const { text: rawText, applied } =
        this.resumeDomainService.applyRewritesToText(
          baseVersion.rawText,
          rewrites,
        );

      if (!applied) {
        throw new BadRequestException(
          'None of the rewrites could be found in the resume text',
        );
      }

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
          `base: ${baseVersion.id}, version: ${version.id}, applied: ${applied}`,
        context,
      );

      return { version, appliedCount: applied };
    } finally {
      release();
    }
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
   * Erases everything a user owns, for account deletion: the resume text is
   * personal data, so a soft delete is not enough. Versions go first, while the
   * resumes that locate them still exist.
   */
  async purgeUser(userId: string): Promise<void> {
    const resumeIds = await this.resumeRepository.findIdsByUserId(userId);

    await this.versionRepository.deleteByResumeIds(resumeIds);
    await this.analysisRepository.deleteByUserId(userId);
    await this.resumeRepository.deleteByUserId(userId);

    this.logger.logger(`Account data erased - user: ${userId}`, {
      module: 'ResumeService',
      method: 'purgeUser',
    });
  }

  /** Without indexes, every rewrite; with them, only the chosen ones. */
  private pickRewrites(
    available: BulletRewrite[],
    indexes?: number[],
  ): BulletRewrite[] {
    if (!indexes) {
      return available;
    }

    if (!indexes.length || indexes.some((i) => !available[i])) {
      throw new BadRequestException('Unknown rewrite selection');
    }

    return indexes.map((i) => available[i]);
  }

  /**
   * Upload and rewrite both call Gemini to parse the text, so they share a
   * daily cap. The day is the UTC calendar day. Runs still in progress count
   * too, and the returned function frees the reservation.
   */
  private reserveParseQuota(key: string, used: number): () => void {
    return this.quota.reserve(
      key,
      used,
      PARSE_DAILY_LIMIT,
      `Daily limit of ${PARSE_DAILY_LIMIT} reached. Try again tomorrow.`,
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

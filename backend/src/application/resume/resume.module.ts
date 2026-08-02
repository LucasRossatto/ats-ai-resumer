import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { modelProviders } from '@infrastructure/models';
import { ResumeRepository } from '@infrastructure/repository/resume.repository';
import { ResumeVersionRepository } from '@infrastructure/repository/resume-version.repository';
import { AnalysisRepository } from '@infrastructure/repository/analysis.repository';
import { ResumeDomainService } from '@domain/services/resume-domain.service';
import { ResumeService } from '@application/services/resume.service';
import { DiffModule } from '@application/diff/diff.module';
import { UploadModule } from '@application/upload/upload.module';

@Module({
  imports: [DatabaseModule, UploadModule, DiffModule],
  providers: [
    ResumeService,
    ResumeDomainService,
    {
      provide: 'IResumeRepository',
      useClass: ResumeRepository,
    },
    {
      provide: 'IResumeVersionRepository',
      useClass: ResumeVersionRepository,
    },
    /**
     * Registered here instead of importing AnalysesModule: that module already
     * imports this one, and deleting a resume has to cascade to its analyses.
     */
    {
      provide: 'IAnalysisRepository',
      useClass: AnalysisRepository,
    },
    ...modelProviders,
  ],
  exports: [ResumeService, 'IResumeRepository', 'IResumeVersionRepository'],
})
export class ResumeModule {}

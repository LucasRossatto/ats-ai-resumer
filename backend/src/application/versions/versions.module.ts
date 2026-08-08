import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { modelProviders } from '@infrastructure/models';
import { VersionsDomainService } from '@domain/services/versions-domain.service';
import { VersionsService } from '@application/services/versions.service';
import { AnalysesModule } from '@application/analyses/analyses.module';
import { ResumeModule } from '@application/resume/resume.module';

@Module({
  /**
   * Read-only like the dashboard and the insights: both modules already expose
   * the repositories it needs, so nothing is registered a second time here.
   */
  imports: [DatabaseModule, ResumeModule, AnalysesModule],
  providers: [VersionsService, VersionsDomainService, ...modelProviders],
  exports: [VersionsService],
})
export class VersionsModule {}

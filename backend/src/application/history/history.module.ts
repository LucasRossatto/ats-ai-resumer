import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { modelProviders } from '@infrastructure/models';
import { HistoryDomainService } from '@domain/services/history-domain.service';
import { HistoryService } from '@application/services/history.service';
import { AnalysesModule } from '@application/analyses/analyses.module';
import { ResumeModule } from '@application/resume/resume.module';

@Module({
  /**
   * Read-only like the dashboard and the versions list: both modules already
   * expose the repositories it needs, so nothing is registered a second time
   * here.
   */
  imports: [DatabaseModule, ResumeModule, AnalysesModule],
  providers: [HistoryService, HistoryDomainService, ...modelProviders],
  exports: [HistoryService],
})
export class HistoryModule {}

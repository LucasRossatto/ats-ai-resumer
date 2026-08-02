import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { modelProviders } from '@infrastructure/models';
import { DashboardDomainService } from '@domain/services/dashboard-domain.service';
import { HistoryDomainService } from '@domain/services/history-domain.service';
import { DashboardService } from '@application/services/dashboard.service';
import { AnalysesModule } from '@application/analyses/analyses.module';
import { ResumeModule } from '@application/resume/resume.module';

@Module({
  /**
   * The dashboard only reads. Both modules already expose the repositories it
   * needs, so nothing is registered a second time here.
   */
  imports: [DatabaseModule, ResumeModule, AnalysesModule],
  providers: [
    DashboardService,
    DashboardDomainService,
    /**
     * The activity feed is built by the history service, not a second copy of
     * it. Registered here rather than imported from HistoryModule: it is a pure
     * domain class with no state, and importing that module would drag its
     * repositories along for nothing.
     */
    HistoryDomainService,
    ...modelProviders,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}

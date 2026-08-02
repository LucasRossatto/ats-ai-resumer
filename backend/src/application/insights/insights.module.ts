import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { modelProviders } from '@infrastructure/models';
import { InsightsDomainService } from '@domain/services/insights-domain.service';
import { InsightsService } from '@application/services/insights.service';
import { AnalysesModule } from '@application/analyses/analyses.module';
import { ResumeModule } from '@application/resume/resume.module';

@Module({
  /**
   * Read-only like the dashboard: both modules already expose the repositories
   * it needs, so nothing is registered a second time here.
   */
  imports: [DatabaseModule, ResumeModule, AnalysesModule],
  providers: [InsightsService, InsightsDomainService, ...modelProviders],
  exports: [InsightsService],
})
export class InsightsModule {}

import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { modelProviders } from '@infrastructure/models';
import { DashboardDomainService } from '@domain/services/dashboard-domain.service';
import { DashboardService } from '@application/services/dashboard.service';
import { AnalysisModule } from '@application/analysis/analysis.module';
import { ResumeModule } from '@application/resume/resume.module';

@Module({
  /**
   * The dashboard only reads. Both modules already expose the repositories it
   * needs, so nothing is registered a second time here.
   */
  imports: [DatabaseModule, ResumeModule, AnalysisModule],
  providers: [DashboardService, DashboardDomainService, ...modelProviders],
  exports: [DashboardService],
})
export class DashboardModule {}

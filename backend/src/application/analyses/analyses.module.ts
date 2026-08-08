import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { modelProviders } from '@infrastructure/models';
import { AnalysisRepository } from '@infrastructure/repository/analysis.repository';
import { AnalysisGeneratorService } from '@infrastructure/ai/analysis-generator.service';
import { AnalysisDomainService } from '@domain/services/analysis-domain.service';
import { AnalysisService } from '@application/services/analysis.service';
import { ResumeModule } from '@application/resume/resume.module';

@Module({
  imports: [DatabaseModule, ResumeModule],
  providers: [
    AnalysisService,
    AnalysisDomainService,
    AnalysisGeneratorService,
    {
      provide: 'IAnalysisRepository',
      useClass: AnalysisRepository,
    },
    ...modelProviders,
  ],
  exports: [AnalysisService, AnalysisGeneratorService, 'IAnalysisRepository'],
})
export class AnalysesModule {}

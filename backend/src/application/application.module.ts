import { AnalysisModule } from '@application/analysis/analysis.module';
import { AuthModule } from '@application/auth/auth.module';
import { DashboardModule } from '@application/dashboard/dashboard.module';
import { DiffModule } from '@application/diff/diff.module';
import { ProfileModule } from '@application/profile/profile.module';
import { ResumeModule } from '@application/resume/resume.module';
import { UploadModule } from '@application/upload/upload.module';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { modelProviders } from '@infrastructure/models';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    AuthModule,
    ProfileModule,
    UploadModule,
    ResumeModule,
    AnalysisModule,
    DashboardModule,
    DiffModule,
    DatabaseModule,
  ],
  providers: [...modelProviders],
  exports: [
    AuthModule,
    ProfileModule,
    UploadModule,
    ResumeModule,
    AnalysisModule,
    DashboardModule,
    DiffModule,
  ],
})
export class ApplicationModule {}

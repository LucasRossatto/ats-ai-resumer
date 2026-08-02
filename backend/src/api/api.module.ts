import { Module } from '@nestjs/common';
import { AuthController } from '@api/controllers/auth.controller';
import { ProfileController } from '@api/controllers/profile.controller';
import { HelloController } from '@api/controllers/hello.controller';
import { UploadController } from '@api/controllers/upload.controller';
import { ResumeController } from '@api/controllers/resume.controller';
import { AnalysisController } from '@api/controllers/analysis.controller';
import { DashboardController } from '@api/controllers/dashboard.controller';
import { InsightsController } from '@api/controllers/insights.controller';
import { VersionsController } from '@api/controllers/versions.controller';
import { ApplicationModule } from '@application/application.module';
import { ResponseService } from '@application/services/response.service';
import { ResponseInterceptor } from '@application/interceptors/response.interceptor';

@Module({
  imports: [ApplicationModule],
  controllers: [
    AuthController,
    ProfileController,
    HelloController,
    UploadController,
    ResumeController,
    AnalysisController,
    DashboardController,
    InsightsController,
    VersionsController,
  ],
  providers: [ResponseService, ResponseInterceptor],
})
export class ApiModule {}

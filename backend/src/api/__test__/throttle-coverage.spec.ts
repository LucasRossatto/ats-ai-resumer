import { ThrottlerGuard } from '@nestjs/throttler';
import { AnalysisController } from '@api/controllers/analysis.controller';
import { AuthController } from '@api/controllers/auth.controller';
import { DashboardController } from '@api/controllers/dashboard.controller';
import { HelloController } from '@api/controllers/hello.controller';
import { HistoryController } from '@api/controllers/history.controller';
import { InsightsController } from '@api/controllers/insights.controller';
import { ProfileController } from '@api/controllers/profile.controller';
import { ResumeController } from '@api/controllers/resume.controller';
import { UploadController } from '@api/controllers/upload.controller';
import { VersionsController } from '@api/controllers/versions.controller';

// /health and /metrics are left out on purpose: the platform health check and
// the Prometheus scrape must not be rate limited.
describe('ThrottlerGuard coverage', () => {
  it.each([
    AnalysisController,
    AuthController,
    DashboardController,
    HelloController,
    HistoryController,
    InsightsController,
    ProfileController,
    ResumeController,
    UploadController,
    VersionsController,
  ])('rate limits %p', (controller) => {
    const guards: unknown[] = Reflect.getMetadata('__guards__', controller);

    expect(guards).toContain(ThrottlerGuard);
  });
});

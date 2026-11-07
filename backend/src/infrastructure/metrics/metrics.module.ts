import { Controller, Get, Global, Module, Res, VERSION_NEUTRAL } from '@nestjs/common';
import type { Response } from 'express';
import {
  PrometheusController,
  getToken,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

export const HTTP_REQUEST_DURATION_METRIC = 'http_request_duration_seconds';

/**
 * The default PrometheusController has no explicit version, so the app's
 * global URI versioning (defaultVersion '1') would push it to /v1/metrics.
 * Pinning it to VERSION_NEUTRAL, like HealthController, keeps it at the
 * plain /metrics path that prometheus.yml scrapes.
 */
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController extends PrometheusController {
  @Get()
  index(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }
}

@Global()
@Module({
  providers: [
    makeHistogramProvider({
      name: HTTP_REQUEST_DURATION_METRIC,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
  ],
  exports: [getToken(HTTP_REQUEST_DURATION_METRIC)],
})
export class MetricsModule {}

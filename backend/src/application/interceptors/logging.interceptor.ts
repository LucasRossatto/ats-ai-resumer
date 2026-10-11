import { HTTP_REQUEST_DURATION_METRIC } from '@infrastructure/metrics/metrics.module';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric(HTTP_REQUEST_DURATION_METRIC)
    private readonly requestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const route = request?.route?.path ?? request?.url ?? 'unknown';
    const method = request?.method ?? 'UNKNOWN';

    const recordDuration = () => {
      const response = context.switchToHttp().getResponse();
      const durationSeconds = (Date.now() - now) / 1000;
      this.requestDuration
        .labels(method, route, String(response?.statusCode ?? 0))
        .observe(durationSeconds);
      console.log(`Execution time... ${Date.now() - now}ms`);
    };

    return next.handle().pipe(tap({ next: recordDuration, error: recordDuration }));
  }
}

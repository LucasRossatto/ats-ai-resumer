import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { METRICS_TOKEN } from '@constants';

/**
 * Protege o /metrics com `Authorization: Bearer <METRICS_TOKEN>`.
 * Sem METRICS_TOKEN o endpoint segue aberto (uso local com o Prometheus do compose).
 */
@Injectable()
export class MetricsTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!METRICS_TOKEN) return true;

    const header: string = context.switchToHttp().getRequest()
      .headers?.authorization;
    const received = Buffer.from(header?.replace(/^Bearer /i, '') ?? '');
    const expected = Buffer.from(METRICS_TOKEN);

    return (
      received.length === expected.length && timingSafeEqual(received, expected)
    );
  }
}

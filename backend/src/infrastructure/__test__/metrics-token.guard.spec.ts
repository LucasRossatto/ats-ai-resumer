/* eslint-disable @typescript-eslint/no-require-imports */
import { ExecutionContext } from '@nestjs/common';

function loadGuard(token: string) {
  let guard: any;
  jest.isolateModules(() => {
    jest.doMock('@constants', () => ({ METRICS_TOKEN: token }));
    const {
      MetricsTokenGuard,
    } = require('@infrastructure/metrics/metrics-token.guard');
    guard = new MetricsTokenGuard();
  });
  return guard;
}

const ctx = (authorization?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  }) as unknown as ExecutionContext;

describe('MetricsTokenGuard', () => {
  it('allows everyone when METRICS_TOKEN is not set', () => {
    expect(loadGuard('').canActivate(ctx())).toBe(true);
  });

  it('rejects a request without the header', () => {
    expect(loadGuard('secret-token').canActivate(ctx())).toBe(false);
  });

  it('rejects a wrong token, including one of a different length', () => {
    const guard = loadGuard('secret-token');
    expect(guard.canActivate(ctx('Bearer wrong-token!'))).toBe(false);
    expect(guard.canActivate(ctx('Bearer x'))).toBe(false);
  });

  it('accepts the right token', () => {
    expect(
      loadGuard('secret-token').canActivate(ctx('Bearer secret-token')),
    ).toBe(true);
  });
});

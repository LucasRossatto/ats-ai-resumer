import { HttpException } from '@nestjs/common';
import { QuotaReservations } from '@application/services/quota-reservations';

describe('QuotaReservations', () => {
  const msg = 'limit reached';

  it('lets requests in while saved plus running stays under the limit', () => {
    const quota = new QuotaReservations();

    expect(() => quota.reserve('u1', 0, 2, msg)).not.toThrow();
    expect(() => quota.reserve('u1', 0, 2, msg)).not.toThrow();
  });

  it('counts running requests, so parallel ones cannot pass the limit', () => {
    const quota = new QuotaReservations();
    quota.reserve('u1', 1, 3, msg);
    quota.reserve('u1', 1, 3, msg);

    expect(() => quota.reserve('u1', 1, 3, msg)).toThrow(HttpException);
  });

  it('answers 429', () => {
    const quota = new QuotaReservations();
    quota.reserve('u1', 0, 1, msg);

    try {
      quota.reserve('u1', 0, 1, msg);
      fail('should have thrown');
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(429);
      expect((error as HttpException).message).toBe(msg);
    }
  });

  it('frees the slot on release, once, even when the work failed', () => {
    const quota = new QuotaReservations();
    const release = quota.reserve('u1', 0, 1, msg);

    release();
    release(); // a second call must not free a slot that belongs to someone else

    const other = quota.reserve('u1', 0, 1, msg);
    expect(() => quota.reserve('u1', 0, 1, msg)).toThrow(HttpException);
    other();
  });

  it('keeps users apart', () => {
    const quota = new QuotaReservations();
    quota.reserve('u1', 0, 1, msg);

    expect(() => quota.reserve('u2', 0, 1, msg)).not.toThrow();
  });
});

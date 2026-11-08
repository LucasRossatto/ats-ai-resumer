import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Closes the gap between "count what is already saved" and "save the new one":
 * requests that are still running count toward the limit too, so parallel
 * requests cannot all read the same count and slip past it.
 *
 * ponytail: the counter lives in this process, so it holds for one instance.
 * With several instances, move it to a conditional $inc in the database.
 */
export class QuotaReservations {
  private readonly inFlight = new Map<string, number>();

  /**
   * Checks and reserves in one synchronous step. Call the returned function
   * when the work is done (use try/finally), whether it succeeded or not.
   */
  reserve(
    key: string,
    used: number,
    limit: number,
    message: string,
  ): () => void {
    const pending = this.inFlight.get(key) ?? 0;

    if (used + pending >= limit) {
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }

    this.inFlight.set(key, pending + 1);

    let released = false;
    return () => {
      if (released) return;
      released = true;

      const left = (this.inFlight.get(key) ?? 1) - 1;
      if (left > 0) {
        this.inFlight.set(key, left);
      } else {
        this.inFlight.delete(key);
      }
    };
  }
}

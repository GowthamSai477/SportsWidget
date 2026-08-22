/** Classic token-bucket limiter; acquire() awaits until tokens are available. */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async acquire(cost = 1): Promise<void> {
    while (true) {
      const now = Date.now();
      this.refill(now);
      if (this.tokens >= cost) {
        this.tokens -= cost;
        return;
      }
      const deficit = cost - this.tokens;
      const waitMs = Math.max(50, Math.ceil((deficit / this.refillPerSecond) * 1000));
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, waitMs);
      await promise;
    }
  }

  private refill(now: number): void {
    const elapsedSec = (now - this.lastRefill) / 1000;
    if (elapsedSec <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillPerSecond);
    this.lastRefill = now;
  }
}

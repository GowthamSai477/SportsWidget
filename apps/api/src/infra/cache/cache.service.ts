import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type { EventStatus } from "@prisma/client";
import { RedisService } from "../redis/redis.service";

/**
 * Status-aware cache TTL policy (spec section 46).
 * Live state is nearly free to recompute from Postgres; the cache shields the
 * database from widget polling bursts while keeping freshness guarantees.
 */
export const TTL_BY_PRIMARY_STATUS: Record<EventStatus, number> = {
  LIVE: 10,
  PAUSED: 30,
  DELAYED: 60,
  SCHEDULED: 300,
  CONFIRMED: 300,
  TBC: 600,
  POSTPONED: 900,
  CANCELLED: 3600,
  FINISHED: 600,
};

export const UNKNOWN_STATUS_TTL_SECONDS = 120;

export const CACHE_TTL = {
  sportsCatalog: 24 * 3600,
  competitionMeta: 12 * 3600,
  standings: 15 * 60,
  schedule: 5 * 60,
  widgetDataDefault: 60,
} as const;

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private static PREFIX = "cache:v1:";

  constructor(private readonly redis: RedisService) {}

  buildKey(...parts: Array<string | number>): string {
    return CacheService.PREFIX + parts.join(":");
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      // Redis failure must never take the API down — fall through to source.
      this.logger.warn(`getJson failed for ${key}: ${(err as Error).message}`);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), "EX", Math.max(1, Math.floor(ttlSeconds)));
    } catch (err) {
      this.logger.warn(`setJson failed for ${key}: ${(err as Error).message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.redis.del(...keys);
    } catch (err) {
      this.logger.warn(`del failed: ${(err as Error).message}`);
    }
  }

  /** SCAN-based invalidation; used sparingly (sync pipeline only). */
  async invalidatePattern(pattern: string): Promise<number> {
    let deleted = 0;
    const full = CacheService.PREFIX + pattern;
    try {
      const stream = this.redis.scanStream({ match: full, count: 200 });
      for await (const keys of stream) {
        if ((keys as string[]).length > 0) {
          await this.redis.del(...(keys as string[]));
          deleted += (keys as string[]).length;
        }
      }
    } catch (err) {
      this.logger.warn(`invalidatePattern(${pattern}) failed: ${(err as Error).message}`);
    }
    return deleted;
  }

  async onModuleDestroy(): Promise<void> {
    // RedisService owns the connection lifecycle.
  }
}

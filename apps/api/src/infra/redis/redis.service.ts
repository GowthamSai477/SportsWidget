import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { parseRedisUrl } from "../../common/utils/redis-url";

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(config: ConfigService) {
    super(parseRedisUrl(config.getOrThrow<string>("redisUrl")));

    // ioredis emits bare 'error' events on connection drops; without a
    // listener Node turns them into uncaught exceptions that kill the API.
    // A Redis outage must degrade (health check + cache misses), not crash.
    this.on("error", (err: Error) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit().catch(() => this.disconnect());
  }
}

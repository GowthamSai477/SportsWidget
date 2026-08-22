import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { parseRedisUrl } from "../../common/utils/redis-url";

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super(parseRedisUrl(config.getOrThrow<string>("redisUrl")));
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit().catch(() => this.disconnect());
  }
}

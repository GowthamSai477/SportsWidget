import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { PrismaService } from "../infra/prisma/prisma.service";
import { RedisService } from "../infra/redis/redis.service";

interface DependencyCheck {
  status: "up" | "down";
  latencyMs: number | null;
  error?: string;
}

@ApiTags("health")
@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Liveness + dependency health (database, redis)" })
  async check(): Promise<{ status: "ok" | "degraded"; uptimeSec: number; checks: Record<string, DependencyCheck> }> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    return {
      status: database.status === "up" ? "ok" : "degraded",
      uptimeSec: Math.floor(process.uptime()),
      checks: { database, redis },
    };
  }

  private async checkDatabase(): Promise<DependencyCheck> {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "up", latencyMs: Date.now() - started };
    } catch (err) {
      return { status: "down", latencyMs: null, error: (err as Error).message };
    }
  }

  private async checkRedis(): Promise<DependencyCheck> {
    const started = Date.now();
    try {
      const pong = await this.redis.ping();
      return { status: pong === "PONG" ? "up" : "down", latencyMs: Date.now() - started };
    } catch (err) {
      return { status: "down", latencyMs: null, error: (err as Error).message };
    }
  }
}

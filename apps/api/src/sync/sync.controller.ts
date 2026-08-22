import { Body, Controller, ForbiddenException, Get, Post, Query } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Public } from "../auth/decorators/public.decorator";
import { PrismaService } from "../infra/prisma/prisma.service";
import { QUEUE_SYNC } from "./queues";
export class RunSyncDto {
  @IsString() competitionSlug!: string;
  @IsOptional() @IsString() providerSlug?: string;
}

@ApiTags("sync")
@Controller("sync")
export class SyncController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_SYNC) private readonly queue: Queue,
  ) {}

  @Public()
  @Post("run")
  @ApiOperation({ summary: "Trigger a full schedule+standings sync (development mode only)" })
  async run(@Body() dto: RunSyncDto) {
    if (!this.config.get<boolean>("developmentMode")) {
      throw new ForbiddenException("Manual sync runs are development-only");
    }
    const jobs = await Promise.all([
      this.queue.add("schedule", { competitionSlug: dto.competitionSlug, providerSlug: dto.providerSlug }),
      this.queue.add("standings", { competitionSlug: dto.competitionSlug, providerSlug: dto.providerSlug }),
    ]);
    return { queued: jobs.map((j) => ({ id: j.id, name: j.name })) };
  }

  @Public()
  @Get("logs")
  @ApiOperation({ summary: "Recent synchronization logs" })
  logs(@Query("limit") limit: string = "20") {
    return this.prisma.syncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100),
      include: { source: { select: { slug: true } } },
    });
  }
}

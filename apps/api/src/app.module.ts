import { join } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bullmq";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { parseRedisUrl } from "./common/utils/redis-url";
import configuration from "./common/config/configuration";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { AuthModule } from "./auth/auth.module";
import { CacheModule } from "./infra/cache/cache.module";
import { InfraModule } from "./infra/infra.module";
import { CompetitionsModule } from "./competitions/competitions.module";
import { DevicesModule } from "./devices/devices.module";
import { EntitlementsModule } from "./entitlements/entitlements.module";
import { StandingsModule } from "./standings/standings.module";
import { TeamsModule } from "./teams/teams.module";
import { SportsModule } from "./sports/sports.module";
import { EventsModule } from "./events/events.module";
import { FavoritesModule } from "./favorites/favorites.module";
import { HealthModule } from "./health/health.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ProvidersModule } from "./providers/providers.module";
import { SyncModule } from "./sync/sync.module";
import { UsersModule } from "./users/users.module";
import { WidgetsModule } from "./widgets/widgets.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // Workspace cwd is apps/api; monorepo root .env takes precedence fallback.
      envFilePath: [join(process.cwd(), ".env"), join(process.cwd(), "../../.env")],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        throttlers: [{ ttl: 60_000, limit: cfg.get("env") === "production" ? 120 : 600 }],
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: parseRedisUrl(cfg.getOrThrow<string>("redisUrl")),
      }),
    }),
    ScheduleModule.forRoot(),
    InfraModule,
    CacheModule,
    EntitlementsModule,
    AuthModule,
    UsersModule,
    DevicesModule,
    FavoritesModule,
    SportsModule,
    CompetitionsModule,
    EventsModule,
    TeamsModule,
    StandingsModule,
    WidgetsModule,
    NotificationsModule,
    ProvidersModule,
    SyncModule,
    HealthModule,
  ],
  providers: [
    // Global auth guard; routes opt out via @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

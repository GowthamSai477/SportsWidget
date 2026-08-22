import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { RedisService } from "./redis/redis.service";

@Global()
@Module({
  providers: [PrismaService, RedisService],
  exports: [PrismaService, RedisService],
})
export class InfraModule {}

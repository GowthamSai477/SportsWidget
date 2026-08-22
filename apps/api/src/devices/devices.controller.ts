import { Body, Controller, Delete, Get, Param, Put, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DevicePlatform } from "@prisma/client";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../infra/prisma/prisma.service";

export class UpsertDeviceDto {
  @IsString() @MinLength(8) @MaxLength(64) deviceId!: string;
  @IsString() @MaxLength(80) name!: string;
  @IsIn(["IOS", "ANDROID"]) platform!: DevicePlatform;
  @IsOptional() @IsString() @MaxLength(32) appVersion?: string;
  @IsOptional() @IsString() @MaxLength(512) pushToken?: string;
}

@ApiTags("devices")
@ApiBearerAuth()
@Controller("users/me/devices")
export class DevicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "List registered devices" })
  list(@CurrentUser() auth: { id: string }) {
    return this.prisma.device.findMany({
      where: { userId: auth.id },
      orderBy: { lastActiveAt: "desc" },
      // No device-count enforcement while DEVELOPMENT_MODE=true (spec section 26).
    });
  }

  @Put()
  @ApiOperation({ summary: "Register or update this device" })
  async upsert(@CurrentUser() auth: { id: string }, @Body() dto: UpsertDeviceDto) {
    return this.prisma.device.upsert({
      where: { userId_deviceId: { userId: auth.id, deviceId: dto.deviceId } },
      update: {
        name: dto.name,
        platform: dto.platform,
        appVersion: dto.appVersion,
        pushToken: dto.pushToken,
        lastActiveAt: new Date(),
      },
      create: { ...dto, userId: auth.id },
    });
  }

  @Delete(":deviceId")
  async remove(@CurrentUser() auth: { id: string }, @Param("deviceId") deviceId: string) {
    const existing = await this.prisma.device.findUnique({
      where: { userId_deviceId: { userId: auth.id, deviceId } },
    });
    if (!existing) throw new UnauthorizedException("Device not registered to this user");
    await this.prisma.device.delete({ where: { id: existing.id } });
    return { removed: deviceId };
  }
}

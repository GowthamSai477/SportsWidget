import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { NotificationCategory } from "@prisma/client";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../infra/prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

class PageQuery {
  @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
}

class SetPreferenceDto {
  @IsEnum(NotificationCategory) category!: NotificationCategory;
  @IsBoolean() enabled!: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) leadMinutes?: number;
}

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("users/me/notifications")
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Inbox with unread count" })
  async list(@CurrentUser() user: { id: string }, @Query() q: PageQuery) {
    const [items, total, unread] = await this.notifications.listForUser(user.id, q.page, q.limit);
    return { items, page: q.page, limit: q.limit, total, unread };
  }

  @Post("read")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mark the whole inbox read" })
  async markRead(@CurrentUser() user: { id: string }) {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  @Get("preferences")
  @ApiOperation({ summary: "Notification preferences" })
  preferences(@CurrentUser() user: { id: string }) {
    return this.notifications.preferencesFor(user.id);
  }

  @Patch("preferences")
  @ApiOperation({ summary: "Update a notification preference" })
  setPreference(@CurrentUser() user: { id: string }, @Body() dto: SetPreferenceDto) {
    return this.notifications.setPreference(user.id, dto.category, dto.enabled, dto.leadMinutes);
  }
}

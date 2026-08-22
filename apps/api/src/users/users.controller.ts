import { BadRequestException, Body, Controller, Get, NotFoundException, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../infra/prisma/prisma.service";

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
  @IsOptional() @IsIn(["dark", "light", "system"]) theme?: "dark" | "light" | "system";
  @IsOptional() @IsString() @MaxLength(10) locale?: string;
}

@ApiTags("users")
@ApiBearerAuth()
@Controller("users/me")
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Current user profile" })
  async me(@CurrentUser() auth: { id: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: auth.id } });
    if (!user || !user.isActive) throw new NotFoundException("User not found");

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { tier: user.planTier } });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      theme: user.theme,
      locale: user.locale,
      plan: {
        tier: user.planTier,
        features: plan?.features ?? {},
        // Purchased-on / expires-on arrive with real subscriptions (Milestone 25).
      },
    };
  }

  @Patch()
  @ApiOperation({ summary: "Update profile settings" })
  async update(@CurrentUser() auth: { id: string }, @Body() dto: UpdateProfileDto) {
    const data: Record<string, string> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.timezone !== undefined) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: dto.timezone });
      } catch {
        throw new BadRequestException("Unknown IANA timezone");
      }
      data.timezone = dto.timezone;
    }
    if (dto.theme !== undefined) data.theme = dto.theme;
    if (dto.locale !== undefined) data.locale = dto.locale;
    return this.prisma.user.update({ where: { id: auth.id }, data });
  }
}

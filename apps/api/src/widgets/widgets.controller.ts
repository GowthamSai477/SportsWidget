import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { WidgetType } from "@prisma/client";
import { IsBoolean, IsEnum, IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreateWidgetDto, WidgetsService } from "./widgets.service";

class UpdateWidgetDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsIn(["small", "medium", "large"]) size?: string;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}

@ApiTags("widgets")
@ApiBearerAuth()
@Controller("users/me/widgets")
export class WidgetsController {
  constructor(private readonly widgets: WidgetsService) {}

  @Get()
  @ApiOperation({ summary: "List my widgets" })
  list(@CurrentUser() user: { id: string }) {
    return this.widgets.listForUser(user.id);
  }

  @Post()
  @ApiOperation({ summary: "Create a widget instance (returns opaque token used by native widgets)" })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateWidgetDto) {
    return this.widgets.create(user.id, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() dto: UpdateWidgetDto) {
    return this.widgets.update(user.id, id, {
      name: dto.name,
      isActive: dto.isActive,
      config: dto.config,
      size: dto.size,
    });
  }

  @Delete(":id")
  remove(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.widgets.remove(user.id, id);
  }
}

export const WIDGET_TYPE_VALUES = Object.values(WidgetType);

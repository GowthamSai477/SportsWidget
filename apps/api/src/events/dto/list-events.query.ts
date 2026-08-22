import { ApiPropertyOptional } from "@nestjs/swagger";
import { EventStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from "class-validator";

export class ListEventsQuery {
  @ApiPropertyOptional({ description: "sport slug" })
  @IsOptional() @IsString() sport?: string;

  @ApiPropertyOptional({ description: "competition slug" })
  @IsOptional() @IsString() competition?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() season?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() roundId?: string;

  @ApiPropertyOptional({ enum: ["RACE", "QUALIFYING", "PRACTICE", "MATCH"] })
  @IsOptional() @IsString() type?: string;

  @ApiPropertyOptional({ enum: EventStatus, isArray: true })
  @IsOptional() @IsArray() @IsEnum(EventStatus, { each: true }) status?: EventStatus[];

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional() @IsISO8601() from?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional() @IsISO8601() to?: string;

  @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
  @IsIn(["asc", "desc"]) sort: "asc" | "desc" = "asc";
}

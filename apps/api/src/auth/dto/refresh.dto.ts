import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class RefreshDto {
  @ApiProperty({ format: "opaque refresh token" })
  @IsString()
  @MinLength(32)
  refreshToken!: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number; // seconds
}

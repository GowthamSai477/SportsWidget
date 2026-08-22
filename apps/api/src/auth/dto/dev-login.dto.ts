import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Development-only login: exchanges an email for a real token pair.
 * Enabled strictly while DEVELOPMENT_MODE=true (spec section 80).
 * Replaced by Google / phone-OTP flows in Milestone 18.
 */
export class DevLoginDto {
  @ApiProperty({ example: "dev@widgets.local" })
  @IsEmail()
  email!: string;

  @ApiProperty({ required: false, example: "Dev User" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

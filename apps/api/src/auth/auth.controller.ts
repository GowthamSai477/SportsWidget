import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { DevLoginDto } from "./dto/dev-login.dto";
import { RefreshDto } from "./dto/refresh.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("dev/login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Development-only email login (DEVELOPMENT_MODE=true only)" })
  async devLogin(@Body() dto: DevLoginDto) {
    const { user, tokens } = await this.auth.devLogin(dto.email, dto.name);
    return { user: { id: user.id, email: user.email, name: user.name, planTier: user.planTier }, ...tokens };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate refresh token, obtain new access token" })
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke the presented refresh token" })
  async logout(@CurrentUser() user: { id: string }, @Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
  }
}

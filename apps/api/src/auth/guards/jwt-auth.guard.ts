import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

interface AccessJwtClaims {
  sub: string;
  email?: string | null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) return false;

    try {
      const claims = await this.jwt.verifyAsync<AccessJwtClaims>(token, {
        secret: this.config.getOrThrow<string>("jwt.secret"),
      });
      request.user = { id: claims.sub, email: claims.email ?? null };
      return true;
    } catch {
      return false;
    }
  }
}

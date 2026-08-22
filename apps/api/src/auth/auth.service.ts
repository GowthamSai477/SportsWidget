import type { SignOptions } from "jsonwebtoken";
import { BadRequestException, ForbiddenException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "node:crypto";
import type { User } from "@prisma/client";
import { PrismaService } from "../infra/prisma/prisma.service";
import type { TokenPair } from "./dto/refresh.dto";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Milestone-18 will replace this with IdP flows; token contract stays identical. */
  async devLogin(email: string, name?: string): Promise<{ user: User; tokens: TokenPair }> {
    if (!this.config.get<boolean>("developmentMode")) {
      throw new ForbiddenException("Dev login is disabled outside DEVELOPMENT_MODE");
    }
    const user = await this.prisma.user.upsert({
      where: { email },
      update: name ? { name } : {},
      create: { email, name: name ?? email.split("@")[0] },
    });
    return { user, tokens: await this.issueTokens(user) };
  }

  async refresh(rawToken: string): Promise<TokenPair> {
    const tokenHash = sha256(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Reuse of a revoked token may indicate theft — revoke the whole family.
    if (stored.revokedAt) {
      this.logger.warn(`Refresh token reuse detected for user ${stored.userId}`);
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Token reuse detected; all sessions revoked");
    }

    // Rotation: revoke the presented token, mint a fresh pair.
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(stored.user);
  }

  async logout(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(rawToken) },
      data: { revokedAt: new Date() },
    });
  }

  async issueTokens(user: User): Promise<TokenPair> {
    const accessTtl = this.config.get<string>("jwt.accessTtl") ?? "15m";
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret: this.config.getOrThrow<string>("jwt.secret"), expiresIn: accessTtl as SignOptions["expiresIn"] },
    );

    const refreshToken = randomBytes(48).toString("hex");
    const ttlDays = parseInt(this.config.get<string>("jwt.refreshTtl") ?? "30d", 10) || 30;
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + ttlDays * 24 * 3600 * 1000),
      },
    });

    const expiresIn = accessTtl.endsWith("m")
      ? parseInt(accessTtl, 10) * 60
      : accessTtl.endsWith("h")
        ? parseInt(accessTtl, 10) * 3600
        : 900;

    if (expiresIn === 0) throw new BadRequestException("Unparseable JWT_ACCESS_TTL");

    return { accessToken, refreshToken, accessExpiresIn: expiresIn };
  }
}

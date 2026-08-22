import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PlanTier } from "@prisma/client";
import type { EntitlementKey, PlanFeatures } from "@widgets/shared";
import { PrismaService } from "../infra/prisma/prisma.service";

/**
 * Feature-flag resolution (spec section 36): explicit grants first, then plan
 * features. DEVELOPMENT_MODE=true short-circuits everything to unlocked so
 * the whole product is testable before monetization (spec section 80).
 */

const PLAN_FEATURE_KEYS: Record<EntitlementKey, keyof PlanFeatures> = {
  WIDGET_SWIPE: "swipe",
  LIVE_DATA: "liveData",
  PREMIUM_WIDGET: "premiumWidgets",
  LOCK_SCREEN: "lockScreen",
  MULTI_DEVICE: "multiDevice",
};

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  get developmentMode(): boolean {
    return this.config.get<boolean>("developmentMode") === true;
  }

  async hasFeature(userId: string, key: EntitlementKey): Promise<boolean> {
    if (this.developmentMode) return true;

    const grants = await this.prisma.entitlement.findMany({
      where: { userId, key, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { id: true },
    });
    if (grants.length > 0) return true;

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { planTier: true } });
    if (!user) return false;
    return this.planGrants(user.planTier, key);
  }

  /** Widget quota for the user; generous ceiling in development mode. */
  async maxWidgets(userId: string): Promise<number> {
    if (this.developmentMode) return 25;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { planTier: true } });
    const plan = user ? await this.prisma.subscriptionPlan.findUnique({ where: { tier: user.planTier } }) : null;
    const features = (plan?.features ?? {}) as Partial<PlanFeatures>;
    return features.maxWidgets ?? 1;
  }

  private async planGrants(tier: PlanTier, key: EntitlementKey): Promise<boolean> {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { tier } });
    const features = (plan?.features ?? {}) as Partial<PlanFeatures>;
    const featureKey = PLAN_FEATURE_KEYS[key];
    const value = features[featureKey];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    return false;
  }
}

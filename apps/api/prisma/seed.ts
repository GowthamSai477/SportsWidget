/**
 * Development seed: sports catalogue, competitions, plans, provider sources,
 * a demo user with favorites/devices/widget. Idempotent — safe to re-run.
 *
 * Real F1 events/standings are NOT seeded here; they arrive via the sync
 * pipeline from the Jolpica provider (or mock fixtures offline).
 * See `npm run sync:f1` / POST /api/v1/sync/run.
 */
import { PlanTier } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SPORTS = [
  { slug: "formula-1", name: "Formula 1", category: "MOTORSPORT", accentColor: "#E10600", sortOrder: 10, isActive: true },
  { slug: "cricket", name: "Cricket", category: "CRICKET", accentColor: "#0B5CAB", sortOrder: 20, isActive: false },
  { slug: "football", name: "Football", category: "FOOTBALL", accentColor: "#0B8A3D", sortOrder: 30, isActive: false },
  { slug: "tennis", name: "Tennis", category: "TENNIS", accentColor: "#9ACD32", sortOrder: 40, isActive: false },
  { slug: "basketball", name: "Basketball", category: "BASKETBALL", accentColor: "#FF6B35", sortOrder: 50, isActive: false },
] as const;

const PLAN_FEATURES = {
  FREE: { maxWidgets: 1, maxSports: 1, swipe: false, premiumWidgets: 0, liveData: false, lockScreen: false },
  SILVER: { maxWidgets: 3, maxSports: 1, swipe: true, premiumWidgets: 0, liveData: true, lockScreen: true },
  GOLD: { maxWidgets: 5, maxSports: 2, swipe: true, premiumWidgets: 2, liveData: true, lockScreen: true },
} as const;

async function main() {
  // ---- Sports ----
  for (const s of SPORTS) {
    await prisma.sport.upsert({
      where: { slug: s.slug },
      update: { name: s.name, category: s.category, accentColor: s.accentColor, sortOrder: s.sortOrder, isActive: s.isActive },
      create: { ...s },
    });
  }

  // ---- Competition + season for F1 ----
  const f1 = await prisma.sport.findUniqueOrThrow({ where: { slug: "formula-1" } });
  const f1Competition = await prisma.competition.upsert({
    where: { slug: "formula-1" },
    update: {},
    create: {
      sportId: f1.id,
      slug: "formula-1",
      name: "FIA Formula One World Championship",
      shortName: "F1",
      region: "World",
    },
  });
  await prisma.season.upsert({
    where: { competitionId_name: { competitionId: f1Competition.id, name: "2026" } },
    update: { isCurrent: true },
    create: { competitionId: f1Competition.id, name: "2026", year: 2026, isCurrent: true },
  });

  // ---- Provider sources ----
  await prisma.providerSource.upsert({
    where: { slug: "jolpica-f1" },
    update: { baseUrl: process.env.JOLPICA_F1_BASE_URL ?? "https://api.jolpi.ca/ergast/f1" },
    create: {
      slug: "jolpica-f1",
      name: "Jolpica-F1 (Ergast successor)",
      sportId: f1.id,
      baseUrl: process.env.JOLPICA_F1_BASE_URL ?? "https://api.jolpi.ca/ergast/f1",
      rateLimitPerSec: 4,
      config: { format: "ergast-json" },
    },
  });
  await prisma.providerSource.upsert({
    where: { slug: "mock-f1" },
    update: {},
    create: {
      slug: "mock-f1",
      name: "Mock F1 fixtures (development only)",
      sportId: f1.id,
      baseUrl: "mock://f1",
      rateLimitPerSec: 1000,
      config: { format: "mock" },
    },
  });

  // ---- Subscription plans (inactive until monetization) ----
  for (const tier of ["FREE", "SILVER", "GOLD"] as PlanTier[]) {
    const prices = { FREE: [0, 0], SILVER: [1000, 9900], GOLD: [1500, 14900] }[tier];
    await prisma.subscriptionPlan.upsert({
      where: { tier },
      update: { features: PLAN_FEATURES[tier] },
      create: {
        tier,
        name: tier.charAt(0) + tier.slice(1).toLowerCase(),
        priceMonthlyCents: prices[0],
        priceYearlyCents: prices[1],
        currency: "INR",
        features: PLAN_FEATURES[tier],
      },
    });
  }

  // ---- Demo user + widget (development convenience) ----
  const dev = await prisma.user.upsert({
    where: { email: "dev@widgets.local" },
    update: {},
    create: {
      email: "dev@widgets.local",
      name: "Dev User",
      timezone: "Asia/Kolkata",
      theme: "dark",
      planTier: PlanTier.GOLD,
    },
  });

  await prisma.device.upsert({
    where: { userId_deviceId: { userId: dev.id, deviceId: "dev-device-0001" } },
    update: { lastActiveAt: new Date() },
    create: { userId: dev.id, deviceId: "dev-device-0001", name: "Galaxy S25 FE", platform: "ANDROID", appVersion: "0.1.0" },
  });

  await prisma.favorite.upsert({
    where: { userId_type_targetId: { userId: dev.id, type: "SPORT", targetId: f1.id } },
    update: {},
    create: { userId: dev.id, type: "SPORT", targetId: f1.id },
  });
  await prisma.favorite.upsert({
    where: { userId_type_targetId: { userId: dev.id, type: "COMPETITION", targetId: f1Competition.id } },
    update: {},
    create: { userId: dev.id, type: "COMPETITION", targetId: f1Competition.id },
  });

  const existingWidget = await prisma.widget.findFirst({ where: { userId: dev.id, type: "PREMIUM" } });
  if (!existingWidget) {
    await prisma.widget.create({
      data: {
        userId: dev.id,
        type: "PREMIUM",
        name: "F1 Premium (demo)",
        size: "medium",
        sportId: f1.id,
        competitionId: f1Competition.id,
        instanceToken: "dev-widget-token-0001",
        config: { focus: "NEXT_RACE", pages: ["next", "drivers", "track", "constructors", "championship"] },
      },
    });
  }

  console.log("Seed complete:", {
    sports: SPORTS.length,
    competition: f1Competition.slug,
    devUser: dev.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

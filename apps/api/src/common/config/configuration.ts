export default () => ({
  env: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "3000", 10),
  // DEVELOPMENT_MODE=true grants every entitlement (spec section 80).
  // MUST be false in any deployed environment.
  developmentMode: process.env.DEVELOPMENT_MODE === "true",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwt: {
    secret: process.env.JWT_SECRET ?? "",
    accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL ?? "30d",
  },
  providers: {
    jolpicaF1BaseUrl: process.env.JOLPICA_F1_BASE_URL ?? "https://api.jolpi.ca/ergast/f1",
  },
});

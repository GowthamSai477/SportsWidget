import { describe, expect, it } from "@jest/globals";
import { parseRedisUrl } from "./redis-url";

describe("parseRedisUrl", () => {
  it("parses plain URLs", () => {
    expect(parseRedisUrl("redis://localhost:6379")).toMatchObject({ host: "localhost", port: 6379 });
  });

  it("parses credentials and defaults the port", () => {
    const opts = parseRedisUrl("redis://:secretpw@redis.example.com");
    expect(opts).toMatchObject({ host: "redis.example.com", port: 6379, password: "secretpw" });
  });

  it("enables TLS for rediss and drops BullMQ-hostile retry limits", () => {
    const opts = parseRedisUrl("rediss://default:pw@cache.internal:6380");
    expect(opts.tls).toBeDefined();
    expect(opts.port).toBe(6380);
    expect(opts.maxRetriesPerRequest).toBeNull();
  });

  it("rejects non-redis protocols", () => {
    expect(() => parseRedisUrl("postgresql://localhost:5432")).toThrow(/Unsupported redis protocol/);
  });
});

import type { RedisOptions } from "ioredis";

/**
 * Parse a redis:// URL into BullMQ/ioredis connection options.
 * Supports redis://[:password@]host:port and rediss:// TLS.
 */
export function parseRedisUrl(rawUrl: string): RedisOptions {
  const url = new URL(rawUrl);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error(`Unsupported redis protocol: ${url.protocol}`);
  }
  const options: RedisOptions = {
    host: url.hostname,
    port: Number(url.port || 6379),
    maxRetriesPerRequest: null, // required by BullMQ workers
    enableReadyCheck: true,
  };
  if (url.password) options.password = url.password;
  if (url.username && url.username !== "default") options.username = url.username;
  if (url.protocol === "rediss:") options.tls = {};
  return options;
}

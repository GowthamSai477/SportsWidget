import { Injectable, Logger } from "@nestjs/common";
import axios, { type AxiosInstance } from "axios";
import { TokenBucket } from "./rate-limiter";

const RETRYABLE_CODES: Record<string, true> = {
  ECONNABORTED: true,
  ECONNREFUSED: true,
  ETIMEDOUT: true,
  EAI_AGAIN: true,
};

export class ProviderError extends Error {
  constructor(
    public readonly providerSlug: string,
    public readonly url: string,
    public readonly cause: unknown,
  ) {
    super(`Provider ${providerSlug} failed for ${url}`);
    this.name = "ProviderError";
  }
}

@Injectable()
export class ProviderHttp {
  private readonly logger = new Logger(ProviderHttp.name);
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({ timeout: 12_000, headers: { "User-Agent": "widgets-api/0.1 (development)" } });
  }

  /** GET JSON with token-bucket pacing, exponential backoff, Retry-After support. */
  async getJson<T>(url: string, opts?: { bucket?: TokenBucket; retries?: number }): Promise<T> {
    const retries = opts?.retries ?? 3;
    await opts?.bucket?.acquire();

    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.client.get<T>(url);
        return response.data;
      } catch (err) {
        lastError = err;
        if (!this.isRetryable(err) || attempt === retries) break;

        const backoffMs = Math.min(8000, 500 * Math.pow(2, attempt)) + Math.floor(Math.random() * 250);
        const retryAfter = this.retryAfterMs(err);
        const waitMs = retryAfter ?? backoffMs;
        this.logger.warn(`GET ${url} failed (attempt ${attempt + 1}/${retries + 1}); retrying in ${waitMs}ms`);
        const { promise, resolve } = Promise.withResolvers<void>();
        setTimeout(resolve, waitMs);
        await promise;
        await opts?.bucket?.acquire();
      }
    }
    throw new ProviderError("http", url, lastError);
  }

  private isRetryable(err: unknown): boolean {
    if (axios.isAxiosError(err)) {
      if (err.code !== undefined && RETRYABLE_CODES[err.code]) return true;
      const status = err.response?.status;
      return status !== undefined && (status === 429 || status >= 500);
    }
    return false;
  }

  private retryAfterMs(err: unknown): number | null {
    if (axios.isAxiosError(err)) {
      const header = err.response?.headers?.["retry-after"];
      const seconds = typeof header === "string" ? parseInt(header, 10) : NaN;
      if (!Number.isNaN(seconds)) return seconds * 1000;
    }
    return null;
  }
}

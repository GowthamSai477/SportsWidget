import { Injectable, Logger } from "@nestjs/common";
import { JolpicaF1Provider } from "./jolpica/jolpica-f1.provider";
import { MockF1Provider } from "./mock/mock.provider";
import type { SportsProvider } from "./sports-provider";

/**
 * Runtime registry mapping provider slugs to implementations.
 * Adding a sport = implementing SportsProvider + registering it here;
 * nothing else in the codebase knows concrete providers exist.
 */
@Injectable()
export class ProviderRegistry {
  private readonly logger = new Logger(ProviderRegistry.name);
  private readonly providers = new Map<string, SportsProvider>();

  constructor(jolpica: JolpicaF1Provider, mock: MockF1Provider) {
    for (const provider of [jolpica, mock] as SportsProvider[]) {
      if (this.providers.has(provider.slug)) {
        throw new Error(`Duplicate provider slug ${provider.slug}`);
      }
      this.providers.set(provider.slug, provider);
    }
    this.logger.log(`Registered providers: ${[...this.providers.keys()].join(", ")}`);
  }

  forSlug(slug: string): SportsProvider | undefined {
    return this.providers.get(slug);
  }

  require(slug: string): SportsProvider {
    const provider = this.providers.get(slug);
    if (!provider) throw new Error(`Unknown provider ${slug}`);
    return provider;
  }

  all(): SportsProvider[] {
    return [...this.providers.values()];
  }
}

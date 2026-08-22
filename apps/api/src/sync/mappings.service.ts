import { Injectable } from "@nestjs/common";
import type { Prisma, ProviderSource } from "@prisma/client";
import { PrismaService } from "../infra/prisma/prisma.service";

/**
 * External-ID resolution (spec section 11): every entity synced from a
 * provider is anchored by a ProviderMapping row so our internal IDs stay
 * stable across provider swaps.
 */
@Injectable()
export class MappingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve an internal ID for (source, entityType, externalId), creating the
   * entity through `createEntity` on first sight. Runs inside `tx` when given
   * so callers can batch whole rounds atomically.
   */
  async resolveInternalId(
    source: Pick<ProviderSource, "id">,
    entityType: string,
    externalId: string,
    createEntity: () => Promise<string>,
    tx?: Prisma.TransactionClient,
  ): Promise<{ internalId: string; created: boolean }> {
    const client = tx ?? this.prisma;
    const existing = await client.providerMapping.findUnique({
      where: { sourceId_entityType_externalId: { sourceId: source.id, entityType, externalId } },
      select: { internalId: true },
    });
    if (existing) {
      await client.providerMapping
        .update({
          where: { sourceId_entityType_externalId: { sourceId: source.id, entityType, externalId } },
          data: { lastSeenAt: new Date() },
        })
        .catch(() => undefined);
      return { internalId: existing.internalId, created: false };
    }

    const internalId = await createEntity();
    await client.providerMapping.create({
      data: { sourceId: source.id, entityType, externalId, internalId },
    });
    return { internalId, created: true };
  }

  findMapping(sourceId: string, entityType: string, externalId: string) {
    return this.prisma.providerMapping.findUnique({
      where: { sourceId_entityType_externalId: { sourceId, entityType, externalId } },
      select: { internalId: true },
    });
  }
}

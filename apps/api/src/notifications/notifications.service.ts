import { Injectable } from "@nestjs/common";
import { NotificationCategory, Prisma } from "@prisma/client";
import { PrismaService } from "../infra/prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fan a notification out to every user favoriting this event, its
   * competition, or its sport. Push delivery (FCM) lands in Milestone 17;
   * the inbox rows are the durable record either way.
   */
  async notifyEventSubscribers(
    event: { id: string; sportId: string; competitionId: string; name: string },
    category: NotificationCategory,
    title: string,
    body: string,
  ): Promise<number> {
    const favorites = await this.prisma.favorite.findMany({
      where: {
        OR: [
          { type: "EVENT", targetId: event.id },
          { type: "COMPETITION", targetId: event.competitionId },
          { type: "SPORT", targetId: event.sportId },
        ],
      },
      select: { userId: true },
      distinct: ["userId"],
    });
    if (favorites.length === 0) return 0;

    await this.prisma.notification.createMany({
      data: favorites.map((f) => ({
        userId: f.userId,
        category,
        title,
        body,
        eventId: event.id,
      })),
      skipDuplicates: true,
    });
    return favorites.length;
  }

  listForUser(userId: string, page: number, limit: number) {
    return this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { event: { select: { id: true, name: true, startTime: true, status: true } } },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
  }

  preferencesFor(userId: string) {
    return this.prisma.notificationPreference.findMany({ where: { userId } });
  }

  setPreference(userId: string, category: NotificationCategory, enabled: boolean, leadMinutes?: number) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_category: { userId, category } },
      update: { enabled, leadMinutes },
      create: { userId, category, enabled, leadMinutes },
    });
  }

  /** Satisfies type-safety for callers building notification data payloads. */
  static data(payload: Record<string, unknown>): Prisma.InputJsonValue {
    return payload as Prisma.InputJsonValue;
  }
}

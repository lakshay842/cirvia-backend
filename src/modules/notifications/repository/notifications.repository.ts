import { prisma } from '@database/index.js';
import type { NotificationType, Prisma } from '@prisma/client';

export class NotificationsRepository {
  async getOrCreatePreferences(userId: string) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updatePreferences(userId: string, data: Prisma.NotificationPreferenceUpdateInput) {
    const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (existing) {
      return prisma.notificationPreference.update({ where: { userId }, data });
    }
    return prisma.notificationPreference.create({
      data: { ...(data as Prisma.NotificationPreferenceUncheckedCreateInput), userId },
    });
  }

  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    dataJson?: Record<string, unknown>;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority ?? 'NORMAL',
        sentAt: new Date(),
        ...(data.dataJson !== undefined && { dataJson: data.dataJson as Prisma.InputJsonValue }),
      },
    });
  }

  async findById(notificationId: string, userId: string) {
    return prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
  }

  async listNotifications(params: {
    userId: string;
    type?: NotificationType;
    unreadOnly?: boolean;
    skip: number;
    take: number;
  }) {
    const where: Prisma.NotificationWhereInput = {
      userId: params.userId,
      ...(params.type !== undefined && { type: params.type }),
      ...(params.unreadOnly === true && { isRead: false }),
    };

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.notification.count({ where }),
    ]);

    return { items, total };
  }

  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markAsRead(notificationId: string, userId: string) {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    if (result.count === 0) {
      return prisma.notification.findFirst({ where: { id: notificationId, userId } });
    }
    return prisma.notification.findFirst({ where: { id: notificationId, userId } });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    return result.count > 0;
  }

  async getUserEmail(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    return user?.email ?? null;
  }

  async findPaymentContext(paymentId: string) {
    return prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        paymentReference: true,
        netAmount: true,
        booking: {
          select: {
            id: true,
            userId: true,
            event: { select: { title: true, slug: true } },
          },
        },
        host: { select: { userId: true } },
      },
    });
  }

  async findBookingContext(bookingId: string) {
    return prisma.eventBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        event: { select: { title: true, slug: true, host: { select: { userId: true } } } },
      },
    });
  }

  async findEventContext(eventId: string) {
    return prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        slug: true,
        host: { select: { userId: true } },
      },
    });
  }

  async findPayoutContext(payoutId: string) {
    return prisma.hostPayout.findUnique({
      where: { id: payoutId },
      select: {
        id: true,
        amount: true,
        host: { select: { userId: true, displayName: true } },
      },
    });
  }

  async listUserDeviceTokens(userId: string): Promise<string[]> {
    const devices = await prisma.userDevice.findMany({
      where: { userId, pushToken: { not: null } },
      select: { pushToken: true },
    });
    return devices.map((d) => d.pushToken).filter((t): t is string => Boolean(t));
  }

  async createAuditLog(params: {
    action: string;
    entityId: string;
    userId?: string;
    changes?: Record<string, unknown>;
    ip?: string;
    browser?: string;
  }) {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: 'notification',
        entityId: params.entityId,
        ...(params.userId && { userId: params.userId }),
        ...(params.changes && { changes: params.changes as Prisma.InputJsonValue }),
        ...(params.ip && { ip: params.ip }),
        ...(params.browser && { browser: params.browser }),
      },
    });
  }
}

export const notificationsRepository = new NotificationsRepository();

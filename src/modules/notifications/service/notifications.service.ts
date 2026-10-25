import { NotFoundError } from '@errors/index.js';
import { getRedisClient } from '@redis/index.js';
import { buildPaginationMeta, parsePagination } from '../../../utils/pagination.util.js';
import { NOTIFICATIONS_CONSTANTS } from '../constants/notifications.constants.js';
import { toNotificationDto, toNotificationPreferencesDto } from '../dto/notifications.dto.js';
import { emitNotificationDomainEvent } from '../events/notifications.events.js';
import { enqueueNotificationJob } from '../events/notifications.queue.js';
import { getEmailProvider, getPushProvider } from '../providers/notification-provider.registry.js';
import { notificationsRepository } from '../repository/notifications.repository.js';
import {
  categoryToNotificationType,
  mapTypeFilter,
  shouldSendEmail,
  shouldSendPush,
} from '../utils/notifications.util.js';
import type {
  AuditMeta,
  DispatchNotificationInput,
  ResolvedNotificationContent,
} from '../types/notifications.types.js';
import type {
  NotificationListQuery,
  UpdateNotificationPreferencesInput,
} from '../schemas/notifications.schema.js';

export class NotificationsService {
  private async writeAudit(
    action: string,
    entityId: string,
    userId?: string,
    changes?: Record<string, unknown>,
    audit?: AuditMeta,
  ): Promise<void> {
    await notificationsRepository.createAuditLog({
      action,
      entityId,
      ...(userId !== undefined && { userId }),
      ...(changes !== undefined && { changes }),
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
  }

  private async invalidateCache(userId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(NOTIFICATIONS_CONSTANTS.REDIS_KEYS.unreadCount(userId));
    } catch {
      // Redis optional
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const redis = getRedisClient();
      const cached = await redis.get(NOTIFICATIONS_CONSTANTS.REDIS_KEYS.unreadCount(userId));
      if (cached !== null) return Number(cached);
    } catch {
      // ignore
    }

    const count = await notificationsRepository.countUnread(userId);

    try {
      const redis = getRedisClient();
      await redis.setex(
        NOTIFICATIONS_CONSTANTS.REDIS_KEYS.unreadCount(userId),
        NOTIFICATIONS_CONSTANTS.REDIS_TTL.unreadCount,
        String(count),
      );
    } catch {
      // ignore
    }

    return count;
  }

  async listNotifications(userId: string, query: NotificationListQuery) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const type = mapTypeFilter(query.type);

    const { items, total } = await notificationsRepository.listNotifications({
      userId,
      ...(type !== undefined && { type }),
      ...(query.unreadOnly !== undefined && { unreadOnly: query.unreadOnly }),
      skip,
      take: limit,
    });

    const unreadCount = await this.getUnreadCount(userId);

    return {
      notifications: items.map((n) => toNotificationDto(n)),
      unreadCount,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getNotification(userId: string, notificationId: string) {
    const notification = await notificationsRepository.findById(notificationId, userId);
    if (!notification) {
      throw new NotFoundError('Notification not found.');
    }
    return toNotificationDto(notification);
  }

  async markAsRead(userId: string, notificationId: string, audit?: AuditMeta) {
    const notification = await notificationsRepository.markAsRead(notificationId, userId);
    if (!notification) {
      throw new NotFoundError('Notification not found.');
    }

    await this.invalidateCache(userId);
    if (!notification.isRead) {
      await this.writeAudit(
        NOTIFICATIONS_CONSTANTS.AUDIT_ACTIONS.READ,
        notificationId,
        userId,
        {},
        audit,
      );
    }

    return toNotificationDto(notification);
  }

  async markAllAsRead(userId: string, audit?: AuditMeta) {
    const count = await notificationsRepository.markAllAsRead(userId);
    await this.invalidateCache(userId);
    await this.writeAudit(
      NOTIFICATIONS_CONSTANTS.AUDIT_ACTIONS.READ_ALL,
      userId,
      userId,
      { count },
      audit,
    );
    return { markedCount: count };
  }

  async deleteNotification(userId: string, notificationId: string, audit?: AuditMeta) {
    const deleted = await notificationsRepository.deleteNotification(notificationId, userId);
    if (!deleted) {
      throw new NotFoundError('Notification not found.');
    }

    await this.invalidateCache(userId);
    await this.writeAudit(
      NOTIFICATIONS_CONSTANTS.AUDIT_ACTIONS.DELETED,
      notificationId,
      userId,
      {},
      audit,
    );
  }

  async getPreferences(userId: string) {
    const prefs = await notificationsRepository.getOrCreatePreferences(userId);
    return toNotificationPreferencesDto(prefs);
  }

  async updatePreferences(userId: string, input: UpdateNotificationPreferencesInput, audit?: AuditMeta) {
    const data = {
      ...(input.email !== undefined && { emailEnabled: input.email }),
      ...(input.push !== undefined && { pushEnabled: input.push }),
      ...(input.sms !== undefined && { smsEnabled: input.sms }),
      ...(input.marketing !== undefined && { marketingEnabled: input.marketing }),
      ...(input.security !== undefined && { securityEnabled: input.security }),
      ...(input.booking !== undefined && { bookingEnabled: input.booking }),
      ...(input.review !== undefined && { reviewEnabled: input.review }),
    };

    const prefs = await notificationsRepository.updatePreferences(userId, data);
    await this.writeAudit(
      NOTIFICATIONS_CONSTANTS.AUDIT_ACTIONS.PREFERENCES_UPDATED,
      userId,
      userId,
      input,
      audit,
    );
    return toNotificationPreferencesDto(prefs);
  }

  async dispatch(input: DispatchNotificationInput): Promise<{ id: string }> {
    const prefs = await this.getPreferences(input.userId);
    const type = input.type;
    const category = input.category;

    const notification = await notificationsRepository.createNotification({
      userId: input.userId,
      type,
      title: input.title,
      message: input.message,
      ...(input.priority !== undefined && { priority: input.priority }),
      dataJson: {
        category,
        ...(input.trigger !== undefined && { trigger: input.trigger }),
        ...(input.dataJson ?? {}),
      },
    });

    await this.invalidateCache(input.userId);
    await this.writeAudit(NOTIFICATIONS_CONSTANTS.AUDIT_ACTIONS.CREATED, notification.id, input.userId, {
      category,
      trigger: input.trigger,
    });

    emitNotificationDomainEvent('notification.created', {
      userId: input.userId,
      notificationId: notification.id,
      category,
    });

    if (!input.skipEmail && shouldSendEmail(category, prefs)) {
      await enqueueNotificationJob(NOTIFICATIONS_CONSTANTS.JOB_TYPES.SEND_EMAIL, {
        userId: input.userId,
        notificationId: notification.id,
        title: input.title,
        message: input.message,
      });
    }

    if (!input.skipPush && shouldSendPush(category, prefs)) {
      await enqueueNotificationJob(NOTIFICATIONS_CONSTANTS.JOB_TYPES.SEND_PUSH, {
        userId: input.userId,
        notificationId: notification.id,
        title: input.title,
        message: input.message,
        dataJson: { category, notificationId: notification.id },
      });
    }

    return { id: notification.id };
  }

  async sendEmailJob(payload: {
    userId: string;
    notificationId?: string;
    title: string;
    message: string;
  }): Promise<void> {
    const email = await notificationsRepository.getUserEmail(payload.userId);
    if (!email) return;

    const provider = getEmailProvider();
    await provider.send({
      to: email,
      subject: payload.title,
      html: `<p>${payload.message}</p>`,
      userId: payload.userId,
      ...(payload.notificationId !== undefined && { notificationId: payload.notificationId }),
    });

    await this.writeAudit(NOTIFICATIONS_CONSTANTS.AUDIT_ACTIONS.EMAIL_SENT, payload.userId, payload.userId, {
      notificationId: payload.notificationId,
    });

    emitNotificationDomainEvent('notification.sent', {
      userId: payload.userId,
      channel: 'email',
      notificationId: payload.notificationId,
    });
  }

  async sendPushJob(payload: {
    userId: string;
    notificationId?: string;
    title: string;
    message: string;
    dataJson?: Record<string, unknown>;
  }): Promise<void> {
    const tokens = await notificationsRepository.listUserDeviceTokens(payload.userId);
    if (tokens.length === 0) return;

    const provider = getPushProvider();
    const data: Record<string, string> = {};
    if (payload.notificationId) data.notificationId = payload.notificationId;
    if (payload.dataJson) {
      for (const [key, value] of Object.entries(payload.dataJson)) {
        if (typeof value === 'string') data[key] = value;
      }
    }

    await provider.send({
      userId: payload.userId,
      title: payload.title,
      body: payload.message,
      deviceTokens: tokens,
      data,
    });

    await this.writeAudit(NOTIFICATIONS_CONSTANTS.AUDIT_ACTIONS.PUSH_SENT, payload.userId, payload.userId, {
      notificationId: payload.notificationId,
      tokenCount: tokens.length,
    });

    emitNotificationDomainEvent('notification.sent', {
      userId: payload.userId,
      channel: 'push',
      notificationId: payload.notificationId,
    });
  }

  async enqueueTrigger(trigger: string, payload: Record<string, unknown>): Promise<void> {
    await enqueueNotificationJob(NOTIFICATIONS_CONSTANTS.JOB_TYPES.DISPATCH, {
      trigger,
      payload,
    });
  }

  async processTrigger(trigger: string, payload: Record<string, unknown>): Promise<void> {
    const resolved = await this.resolveTrigger(trigger, payload);
    if (!resolved) return;

    const items = Array.isArray(resolved) ? resolved : [resolved];
    for (const item of items) {
      await this.dispatch({
        userId: item.userId,
        type: item.type,
        category: item.category,
        title: item.title,
        message: item.message,
        priority: item.priority,
        ...(item.dataJson !== undefined && { dataJson: item.dataJson }),
        trigger,
      });
    }
  }

  private async resolveTrigger(
    trigger: string,
    payload: Record<string, unknown>,
  ): Promise<ResolvedNotificationContent | ResolvedNotificationContent[] | null> {
    const { TRIGGERS, CATEGORIES } = NOTIFICATIONS_CONSTANTS;

    switch (trigger) {
      case TRIGGERS.BOOKING_CREATED: {
        const bookingId = String(payload.bookingId ?? '');
        const ctx = bookingId ? await notificationsRepository.findBookingContext(bookingId) : null;
        const userId = String(payload.userId ?? ctx?.userId ?? '');
        if (!userId) return null;
        return {
          userId,
          type: categoryToNotificationType(CATEGORIES.BOOKING),
          category: CATEGORIES.BOOKING,
          title: 'Booking Created',
          message: ctx
            ? `Your booking for "${ctx.event.title}" has been created.`
            : 'Your booking has been created.',
          priority: 'NORMAL',
          dataJson: { bookingId, eventSlug: ctx?.event.slug },
        };
      }

      case 'booking.approved':
      case TRIGGERS.BOOKING_CONFIRMED: {
        const bookingId = String(payload.bookingId ?? '');
        const ctx = bookingId ? await notificationsRepository.findBookingContext(bookingId) : null;
        const userId = String(payload.userId ?? ctx?.userId ?? '');
        if (!userId) return null;
        return {
          userId,
          type: 'BOOKING',
          category: CATEGORIES.BOOKING,
          title: 'Booking Confirmed',
          message: ctx
            ? `Your booking for "${ctx.event.title}" is confirmed.`
            : 'Your booking has been confirmed.',
          priority: 'HIGH',
          dataJson: { bookingId },
        };
      }

      case TRIGGERS.BOOKING_CANCELLED: {
        const bookingId = String(payload.bookingId ?? '');
        const ctx = bookingId ? await notificationsRepository.findBookingContext(bookingId) : null;
        const userId = String(payload.userId ?? ctx?.userId ?? '');
        if (!userId) return null;
        return {
          userId,
          type: 'BOOKING',
          category: CATEGORIES.BOOKING,
          title: 'Booking Cancelled',
          message: ctx
            ? `Your booking for "${ctx.event.title}" has been cancelled.`
            : 'Your booking has been cancelled.',
          priority: 'HIGH',
          dataJson: { bookingId },
        };
      }

      case TRIGGERS.WAITLIST_PROMOTED: {
        const bookingId = String(payload.bookingId ?? '');
        const ctx = bookingId ? await notificationsRepository.findBookingContext(bookingId) : null;
        const userId = String(payload.userId ?? ctx?.userId ?? '');
        if (!userId) return null;
        return {
          userId,
          type: 'BOOKING',
          category: CATEGORIES.BOOKING,
          title: 'Spot Available — Complete Your Booking',
          message: ctx
            ? `A spot opened for "${ctx.event.title}". Your waitlist entry has been converted to a booking.`
            : 'A spot opened on your waitlisted event. Complete your booking now.',
          priority: 'HIGH',
          dataJson: { bookingId, eventId: payload.eventId, waitlistId: payload.waitlistId },
        };
      }

      case TRIGGERS.PAYMENT_SUCCESS: {
        const paymentId = String(payload.paymentId ?? '');
        const ctx = paymentId ? await notificationsRepository.findPaymentContext(paymentId) : null;
        const userId = ctx?.booking.userId;
        if (!userId) return null;
        const results: ResolvedNotificationContent[] = [
          {
            userId,
            type: 'PAYMENT',
            category: CATEGORIES.PAYMENT,
            title: 'Payment Successful',
            message: ctx
              ? `Payment received for "${ctx.booking.event.title}".`
              : 'Your payment was successful.',
            priority: 'HIGH',
            dataJson: { paymentId, bookingId: ctx.booking.id },
          },
        ];
        if (ctx.booking.id) {
          results.push({
            userId,
            type: 'BOOKING',
            category: CATEGORIES.BOOKING,
            title: 'Booking Confirmed',
            message: `Your booking for "${ctx.booking.event.title}" is confirmed.`,
            priority: 'HIGH',
            dataJson: { bookingId: ctx.booking.id, paymentId },
          });
        }
        return results;
      }

      case TRIGGERS.PAYMENT_FAILED: {
        const paymentId = String(payload.paymentId ?? '');
        const ctx = paymentId ? await notificationsRepository.findPaymentContext(paymentId) : null;
        const userId = ctx?.booking.userId;
        if (!userId) return null;
        return {
          userId,
          type: 'PAYMENT',
          category: CATEGORIES.PAYMENT,
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again.',
          priority: 'URGENT',
          dataJson: { paymentId, reason: payload.reason },
        };
      }

      case TRIGGERS.REFUND: {
        const paymentId = String(payload.paymentId ?? '');
        const ctx = paymentId ? await notificationsRepository.findPaymentContext(paymentId) : null;
        const userId = ctx?.booking.userId;
        if (!userId) return null;
        return {
          userId,
          type: 'REFUND',
          category: CATEGORIES.PAYMENT,
          title: 'Refund Processed',
          message: ctx
            ? `A refund has been processed for "${ctx.booking.event.title}".`
            : 'Your refund has been processed.',
          priority: 'HIGH',
          dataJson: { paymentId, refundId: payload.refundId },
        };
      }

      case TRIGGERS.WALLET_SETTLEMENT: {
        const userId = String(payload.hostUserId ?? '');
        if (!userId) return null;
        return {
          userId,
          type: 'PAYMENT',
          category: CATEGORIES.WALLET,
          title: 'Wallet Settlement',
          message: 'Your event earnings have been settled to your available balance.',
          priority: 'NORMAL',
          dataJson: { paymentId: payload.paymentId, netAmount: payload.netAmount },
        };
      }

      case TRIGGERS.WITHDRAWAL_APPROVED: {
        const payoutId = String(payload.payoutId ?? '');
        const ctx = payoutId ? await notificationsRepository.findPayoutContext(payoutId) : null;
        const userId = String(ctx?.host.userId ?? '');
        if (!userId) return null;
        return {
          userId,
          type: 'PAYMENT',
          category: CATEGORIES.WALLET,
          title: 'Withdrawal Approved',
          message: 'Your withdrawal request has been approved and disbursed.',
          priority: 'HIGH',
          dataJson: { payoutId },
        };
      }

      case TRIGGERS.WITHDRAWAL_REJECTED: {
        const payoutId = String(payload.payoutId ?? '');
        const ctx = payoutId ? await notificationsRepository.findPayoutContext(payoutId) : null;
        const userId = String(ctx?.host.userId ?? '');
        if (!userId) return null;
        return {
          userId,
          type: 'PAYMENT',
          category: CATEGORIES.WALLET,
          title: 'Withdrawal Rejected',
          message: 'Your withdrawal request was rejected. Funds have been restored to your wallet.',
          priority: 'HIGH',
          dataJson: { payoutId, reason: payload.reason },
        };
      }

      case TRIGGERS.HOST_APPROVED: {
        const userId = String(payload.userId ?? '');
        if (!userId) return null;
        return {
          userId,
          type: 'VERIFICATION',
          category: CATEGORIES.HOST,
          title: 'Host Approved',
          message: 'Congratulations! Your host application has been approved.',
          priority: 'HIGH',
          dataJson: { hostId: payload.hostId },
        };
      }

      case TRIGGERS.HOST_REJECTED: {
        const userId = String(payload.userId ?? '');
        if (!userId) return null;
        return {
          userId,
          type: 'VERIFICATION',
          category: CATEGORIES.HOST,
          title: 'Host Rejected',
          message: `Your host application was rejected.${payload.reason ? ` Reason: ${String(payload.reason)}` : ''}`,
          priority: 'HIGH',
          dataJson: { hostId: payload.hostId, reason: payload.reason },
        };
      }

      case TRIGGERS.EVENT_APPROVED: {
        const eventId = String(payload.eventId ?? '');
        const ctx = eventId ? await notificationsRepository.findEventContext(eventId) : null;
        const userId = ctx?.host.userId;
        if (!userId) return null;
        return {
          userId,
          type: 'REMINDER',
          category: CATEGORIES.EVENT,
          title: 'Event Approved',
          message: ctx ? `"${ctx.title}" has been approved and is live.` : 'Your event has been approved.',
          priority: 'HIGH',
          dataJson: { eventId, slug: ctx?.slug },
        };
      }

      case TRIGGERS.EVENT_CANCELLED: {
        const eventId = String(payload.eventId ?? '');
        const ctx = eventId ? await notificationsRepository.findEventContext(eventId) : null;
        const userId = ctx?.host.userId;
        if (!userId) return null;
        return {
          userId,
          type: 'REMINDER',
          category: CATEGORIES.EVENT,
          title: 'Event Cancelled',
          message: ctx ? `"${ctx.title}" has been cancelled.` : 'Your event has been cancelled.',
          priority: 'URGENT',
          dataJson: { eventId, reason: payload.reason },
        };
      }

      case TRIGGERS.KYC_APPROVED: {
        const userId = String(payload.userId ?? '');
        if (!userId) return null;
        return {
          userId,
          type: 'VERIFICATION',
          category: CATEGORIES.KYC,
          title: 'KYC Approved',
          message: 'Your identity verification has been approved.',
          priority: 'HIGH',
          dataJson: { verificationId: payload.verificationId },
        };
      }

      case TRIGGERS.KYC_REJECTED: {
        const userId = String(payload.userId ?? '');
        if (!userId) return null;
        return {
          userId,
          type: 'VERIFICATION',
          category: CATEGORIES.KYC,
          title: 'KYC Rejected',
          message: String(payload.reason ?? 'Your identity verification was not approved.'),
          priority: 'HIGH',
          dataJson: { verificationId: payload.verificationId, reason: payload.reason },
        };
      }

      case TRIGGERS.KYC_SUBMITTED: {
        const userId = String(payload.userId ?? '');
        if (!userId) return null;
        return {
          userId,
          type: 'VERIFICATION',
          category: CATEGORIES.KYC,
          title: 'KYC Submitted',
          message: 'Your verification has been submitted for review.',
          priority: 'NORMAL',
          dataJson: { verificationId: payload.verificationId },
        };
      }

      default:
        return null;
    }
  }
}

export const notificationsService = new NotificationsService();

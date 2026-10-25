import type { Notification, NotificationPreference } from '@prisma/client';

export interface NotificationView {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  priority: string;
  isRead: boolean;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationSummaryView {
  unreadCount: number;
}

export function toNotificationDto(notification: Notification): NotificationView {
  const data = notification.dataJson as Record<string, unknown> | null;
  return {
    id: notification.id,
    type: notification.type.toLowerCase(),
    category: typeof data?.category === 'string' ? data.category : notification.type.toLowerCase(),
    title: notification.title,
    message: notification.message,
    data: data ?? null,
    priority: notification.priority.toLowerCase(),
    isRead: notification.isRead,
    readAt: notification.readAt?.toISOString() ?? null,
    sentAt: notification.sentAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export function toNotificationPreferencesDto(
  prefs: NotificationPreference,
): {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  security: boolean;
  booking: boolean;
  review: boolean;
} {
  return {
    email: prefs.emailEnabled,
    push: prefs.pushEnabled,
    sms: prefs.smsEnabled,
    marketing: prefs.marketingEnabled,
    security: prefs.securityEnabled,
    booking: prefs.bookingEnabled,
    review: prefs.reviewEnabled,
  };
}

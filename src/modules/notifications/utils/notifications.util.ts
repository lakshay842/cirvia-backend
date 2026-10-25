import type { NotificationType } from '@prisma/client';
import { NOTIFICATIONS_CONSTANTS } from '../constants/notifications.constants.js';
import type { NotificationCategory, NotificationPreferencesView } from '../types/notifications.types.js';

export function mapTypeFilter(type: string): NotificationType | undefined {
  if (type === 'all') return undefined;
  const map: Record<string, NotificationType> = {
    booking: 'BOOKING',
    payment: 'PAYMENT',
    refund: 'REFUND',
    verification: 'VERIFICATION',
    reminder: 'REMINDER',
    promotion: 'PROMOTION',
    security: 'SECURITY',
    support: 'SUPPORT',
    review: 'REVIEW',
    trust_score: 'TRUST_SCORE',
  };
  return map[type];
}

export function categoryToNotificationType(category: NotificationCategory): NotificationType {
  const map: Record<NotificationCategory, NotificationType> = {
    booking: 'BOOKING',
    payment: 'PAYMENT',
    wallet: 'PAYMENT',
    kyc: 'VERIFICATION',
    host: 'VERIFICATION',
    event: 'REMINDER',
    system: 'SECURITY',
    marketing: 'PROMOTION',
    admin: 'SECURITY',
  };
  return map[category];
}

export function isMandatoryCategory(category: NotificationCategory): boolean {
  return category === 'system' || category === 'admin';
}

export function preferenceKeyForCategory(
  category: NotificationCategory,
): keyof Pick<NotificationPreferencesView, 'booking' | 'marketing' | 'security' | 'review'> {
  switch (category) {
    case NOTIFICATIONS_CONSTANTS.CATEGORIES.MARKETING:
      return 'marketing';
    case NOTIFICATIONS_CONSTANTS.CATEGORIES.SYSTEM:
    case NOTIFICATIONS_CONSTANTS.CATEGORIES.ADMIN:
      return 'security';
    default:
      return 'booking';
  }
}

export function shouldSendEmail(
  category: NotificationCategory,
  prefs: NotificationPreferencesView,
): boolean {
  if (!prefs.email) return false;
  if (isMandatoryCategory(category)) return true;
  const key = preferenceKeyForCategory(category);
  return prefs[key];
}

export function shouldSendPush(
  category: NotificationCategory,
  prefs: NotificationPreferencesView,
): boolean {
  if (!prefs.push) return false;
  if (isMandatoryCategory(category)) return true;
  const key = preferenceKeyForCategory(category);
  return prefs[key];
}

export function listQueryCacheHash(query: { page: number; limit: number; type: string; unreadOnly?: boolean }): string {
  return `${query.page}:${query.limit}:${query.type}:${query.unreadOnly ? '1' : '0'}`;
}

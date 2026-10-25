import { describe, it, expect } from 'vitest';
import {
  notificationListQuerySchema,
  notificationIdParamSchema,
  updateNotificationPreferencesSchema,
} from '../src/modules/notifications/schemas/notifications.schema.js';
import { NOTIFICATIONS_CONSTANTS } from '../src/modules/notifications/constants/notifications.constants.js';
import {
  mapTypeFilter,
  categoryToNotificationType,
  shouldSendEmail,
  preferenceKeyForCategory,
  isMandatoryCategory,
} from '../src/modules/notifications/utils/notifications.util.js';

describe('Notification schemas', () => {
  it('validates list query defaults', () => {
    const parsed = notificationListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(parsed.type).toBe('all');
  });

  it('validates notification id param', () => {
    expect(
      notificationIdParamSchema.safeParse({
        notificationId: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true);
  });

  it('rejects empty preferences update', () => {
    expect(updateNotificationPreferencesSchema.safeParse({}).success).toBe(false);
  });

  it('validates preferences patch', () => {
    expect(updateNotificationPreferencesSchema.safeParse({ email: false }).success).toBe(true);
  });
});

describe('Notification utilities', () => {
  it('maps type filter to prisma enum', () => {
    expect(mapTypeFilter('booking')).toBe('BOOKING');
    expect(mapTypeFilter('all')).toBeUndefined();
  });

  it('maps category to notification type', () => {
    expect(categoryToNotificationType(NOTIFICATIONS_CONSTANTS.CATEGORIES.WALLET)).toBe('PAYMENT');
    expect(categoryToNotificationType(NOTIFICATIONS_CONSTANTS.CATEGORIES.KYC)).toBe('VERIFICATION');
  });

  it('identifies mandatory categories', () => {
    expect(isMandatoryCategory(NOTIFICATIONS_CONSTANTS.CATEGORIES.ADMIN)).toBe(true);
    expect(isMandatoryCategory(NOTIFICATIONS_CONSTANTS.CATEGORIES.BOOKING)).toBe(false);
  });

  it('maps category to preference key', () => {
    expect(preferenceKeyForCategory(NOTIFICATIONS_CONSTANTS.CATEGORIES.MARKETING)).toBe('marketing');
    expect(preferenceKeyForCategory(NOTIFICATIONS_CONSTANTS.CATEGORIES.PAYMENT)).toBe('booking');
  });

  it('respects email preferences', () => {
    const prefs = {
      email: true,
      push: true,
      sms: false,
      marketing: false,
      security: true,
      booking: false,
      review: true,
    };
    expect(shouldSendEmail(NOTIFICATIONS_CONSTANTS.CATEGORIES.BOOKING, prefs)).toBe(false);
    expect(shouldSendEmail(NOTIFICATIONS_CONSTANTS.CATEGORIES.ADMIN, prefs)).toBe(true);
  });

  it('defines redis unread key', () => {
    expect(NOTIFICATIONS_CONSTANTS.REDIS_KEYS.unreadCount('user-1')).toBe(
      'cache:notifications:unread:user-1',
    );
  });

  it('defines all required triggers', () => {
    expect(NOTIFICATIONS_CONSTANTS.TRIGGERS.PAYMENT_SUCCESS).toBe('payment.success');
    expect(NOTIFICATIONS_CONSTANTS.TRIGGERS.KYC_APPROVED).toBe('verification.approved');
    expect(NOTIFICATIONS_CONSTANTS.TRIGGERS.WITHDRAWAL_REJECTED).toBe('wallet.withdrawal_rejected');
    expect(NOTIFICATIONS_CONSTANTS.TRIGGERS.WAITLIST_PROMOTED).toBe('WAITLIST_PROMOTED');
  });
});

import type { NotificationPriority, NotificationType } from '@prisma/client';
import type { NOTIFICATIONS_CONSTANTS } from '../constants/notifications.constants.js';

export type NotificationCategory =
  (typeof NOTIFICATIONS_CONSTANTS.CATEGORIES)[keyof typeof NOTIFICATIONS_CONSTANTS.CATEGORIES];

export type NotificationTrigger =
  (typeof NOTIFICATIONS_CONSTANTS.TRIGGERS)[keyof typeof NOTIFICATIONS_CONSTANTS.TRIGGERS];

export interface AuditMeta {
  ip?: string;
  browser?: string;
}

export interface DispatchNotificationInput {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  priority?: NotificationPriority;
  dataJson?: Record<string, unknown>;
  trigger?: string;
  skipEmail?: boolean;
  skipPush?: boolean;
}

export interface NotificationPreferencesView {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  security: boolean;
  booking: boolean;
  review: boolean;
}

export interface ResolvedNotificationContent {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  priority: NotificationPriority;
  dataJson?: Record<string, unknown>;
}

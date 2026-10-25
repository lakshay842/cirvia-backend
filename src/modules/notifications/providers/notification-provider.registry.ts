import type {
  EmailNotificationPayload,
  NotificationChannelProvider,
  PushNotificationPayload,
} from './notification-provider.interface.js';
import { smtpEmailNotificationProvider } from './email-notification.provider.js';
import { stubPushNotificationProvider } from './push-notification.provider.js';

const emailProviders = new Map<string, NotificationChannelProvider<EmailNotificationPayload>>([
  [smtpEmailNotificationProvider.name, smtpEmailNotificationProvider],
]);

const pushProviders = new Map<string, NotificationChannelProvider<PushNotificationPayload>>([
  [stubPushNotificationProvider.name, stubPushNotificationProvider],
]);

export function getEmailProvider(name = 'smtp'): NotificationChannelProvider<EmailNotificationPayload> {
  return emailProviders.get(name) ?? smtpEmailNotificationProvider;
}

export function getPushProvider(name = 'stub'): NotificationChannelProvider<PushNotificationPayload> {
  return pushProviders.get(name) ?? stubPushNotificationProvider;
}

export function registerEmailProvider(
  name: string,
  provider: NotificationChannelProvider<EmailNotificationPayload>,
): void {
  emailProviders.set(name, provider);
}

export function registerPushProvider(
  name: string,
  provider: NotificationChannelProvider<PushNotificationPayload>,
): void {
  pushProviders.set(name, provider);
}

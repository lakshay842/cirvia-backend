import { getLogger } from '@logger/index.js';
import type {
  NotificationChannelProvider,
  PushNotificationPayload,
} from './notification-provider.interface.js';

const logger = getLogger();

/**
 * Stub push provider — ready for Firebase / OneSignal / APNs / FCM adapters.
 */
export class StubPushNotificationProvider implements NotificationChannelProvider<PushNotificationPayload> {
  readonly name = 'stub';

  async send(payload: PushNotificationPayload): Promise<void> {
    logger.info(
      {
        userId: payload.userId,
        title: payload.title,
        tokenCount: payload.deviceTokens.length,
        provider: this.name,
      },
      'Push notification queued (provider stub — wire Firebase/OneSignal/APNs/FCM)',
    );
  }
}

export class FirebasePushNotificationProvider implements NotificationChannelProvider<PushNotificationPayload> {
  readonly name = 'firebase';

  async send(payload: PushNotificationPayload): Promise<void> {
    logger.info(
      { userId: payload.userId, provider: this.name, tokenCount: payload.deviceTokens.length },
      'Firebase push stub — implement FCM adapter',
    );
  }
}

export class OneSignalPushNotificationProvider implements NotificationChannelProvider<PushNotificationPayload> {
  readonly name = 'onesignal';

  async send(payload: PushNotificationPayload): Promise<void> {
    logger.info(
      { userId: payload.userId, provider: this.name, tokenCount: payload.deviceTokens.length },
      'OneSignal push stub — implement adapter',
    );
  }
}

export const stubPushNotificationProvider = new StubPushNotificationProvider();

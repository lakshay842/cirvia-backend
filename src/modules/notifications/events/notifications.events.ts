import { getLogger } from '@logger/index.js';

const logger = getLogger();

export type NotificationDomainEvent =
  | 'notification.created'
  | 'notification.sent'
  | 'notification.read';

export function emitNotificationDomainEvent(
  event: NotificationDomainEvent,
  payload: Record<string, unknown>,
): void {
  logger.info({ event, ...payload }, 'Notification domain event');
}

export async function bridgeDomainEventToNotifications(
  trigger: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const { notificationsService } = await import('../service/notifications.service.js');
    await notificationsService.enqueueTrigger(trigger, payload);
  } catch (error) {
    logger.warn({ trigger, err: error }, 'Failed to enqueue notification trigger');
  }
}

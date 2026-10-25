import { getLogger } from '@logger/index.js';
import { bridgeDomainEventToNotifications } from '../../notifications/events/notifications.events.js';

const logger = getLogger();

export function emitBookingDomainEvent(
  event: string,
  payload: Record<string, unknown>,
): void {
  logger.info({ event, ...payload }, 'Booking domain event');
  void bridgeDomainEventToNotifications(event, payload);
}

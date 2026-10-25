import { getLogger } from '@logger/index.js';

const logger = getLogger();

export type EventDomainEventType =
  | 'event.created'
  | 'event.updated'
  | 'event.published'
  | 'event.cancelled'
  | 'event.approved'
  | 'event.rejected'
  | 'event.featured';

import { bridgeDomainEventToNotifications } from '../../notifications/events/notifications.events.js';

export function emitEventDomainEvent(
  event: EventDomainEventType,
  payload: Record<string, unknown>,
): void {
  logger.info({ event, ...payload }, 'Event domain event emitted');
  void bridgeDomainEventToNotifications(event, payload);
}

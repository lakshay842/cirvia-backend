import { getLogger } from '@logger/index.js';

const logger = getLogger();

export type HostEventType =
  | 'host.created'
  | 'host.profile.updated'
  | 'host.approved'
  | 'host.rejected'
  | 'host.suspended';

import { bridgeDomainEventToNotifications } from '../../notifications/events/notifications.events.js';

export function emitHostEvent(event: HostEventType, payload: Record<string, unknown>): void {
  logger.info({ event, ...payload }, 'Host domain event emitted');
  void bridgeDomainEventToNotifications(event, payload);
}

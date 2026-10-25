import { getLogger } from '@logger/index.js';

const logger = getLogger();

export type ReviewDomainEvent =
  | 'review.submitted'
  | 'review.updated'
  | 'review.deleted'
  | 'review.replied'
  | 'review.reported'
  | 'review.moderated';

export function emitReviewDomainEvent(
  event: ReviewDomainEvent,
  payload: Record<string, unknown>,
): void {
  logger.info({ event, ...payload }, 'Review domain event');
  void import('../../notifications/events/notifications.events.js')
    .then(({ bridgeDomainEventToNotifications }) => bridgeDomainEventToNotifications(event, payload))
    .catch(() => {});
}

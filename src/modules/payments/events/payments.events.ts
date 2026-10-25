import { getLogger } from '@logger/index.js';
import type { WebhookProcessPayload } from '../types/payments.types.js';

const logger = getLogger();

export type PaymentDomainEvent =
  | 'payment.order_created'
  | 'payment.success'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.refund_requested'
  | 'payment.refund_completed'
  | 'payment.settlement_scheduled'
  | 'payment.completed';

import { bridgeDomainEventToNotifications } from '../../notifications/events/notifications.events.js';

export function emitPaymentDomainEvent(
  event: PaymentDomainEvent,
  payload: Record<string, unknown>,
): void {
  logger.info({ event, ...payload }, 'Payment domain event');
  void bridgeDomainEventToNotifications(event, payload);
}

export function mapWebhookToDomainEvent(webhookEvent: string): PaymentDomainEvent | null {
  const map: Record<string, PaymentDomainEvent> = {
    'payment.captured': 'payment.success',
    'payment.failed': 'payment.failed',
    'refund.processed': 'payment.refund_completed',
    'order.paid': 'payment.completed',
  };
  return map[webhookEvent] ?? null;
}

export type { WebhookProcessPayload };

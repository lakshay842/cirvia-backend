import { getLogger } from '@logger/index.js';

const logger = getLogger();

export type WalletDomainEvent =
  | 'wallet.credited'
  | 'wallet.settled'
  | 'wallet.withdrawal_requested'
  | 'wallet.withdrawal_approved'
  | 'wallet.withdrawal_rejected'
  | 'wallet.refund_reversed';

import { bridgeDomainEventToNotifications } from '../../notifications/events/notifications.events.js';

export function emitWalletDomainEvent(
  event: WalletDomainEvent,
  payload: Record<string, unknown>,
): void {
  logger.info({ event, ...payload }, 'Wallet domain event');
  void bridgeDomainEventToNotifications(event, payload);
}

import { getLogger } from '@logger/index.js';
import { bridgeDomainEventToNotifications } from '../../notifications/events/notifications.events.js';

const logger = getLogger();

export const VERIFICATION_EVENTS = {
  SUBMITTED: 'verification.submitted',
  APPROVED: 'verification.approved',
  REJECTED: 'verification.rejected',
  EXPIRED: 'verification.expired',
  REUPLOAD_REQUESTED: 'verification.reupload_requested',
  DOCUMENT_UPLOADED: 'verification.document_uploaded',
} as const;

export type VerificationEventName =
  (typeof VERIFICATION_EVENTS)[keyof typeof VERIFICATION_EVENTS];

export interface VerificationEventPayload {
  verificationId: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

export function emitVerificationEvent(
  event: VerificationEventName,
  payload: VerificationEventPayload & Record<string, unknown>,
): void {
  logger.info({ event, ...payload }, 'Verification domain event');
  void bridgeDomainEventToNotifications(event, payload);
}

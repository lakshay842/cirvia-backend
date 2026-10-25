import type { SettlementRecord } from '../types/payments.types.js';

/**
 * Settlement architecture — records pending host settlement without wallet credits.
 * Wallet module will consume these records when implemented.
 */
export function buildSettlementRecord(
  paymentId: string,
  hostId: string,
  netAmount: number,
  platformFee: number,
): SettlementRecord {
  return {
    paymentId,
    hostId,
    netAmount,
    platformFee,
    scheduledAt: new Date().toISOString(),
    status: 'PENDING_SETTLEMENT',
  };
}

export function isSettlementEligible(eventEnd: Date): boolean {
  return eventEnd <= new Date();
}

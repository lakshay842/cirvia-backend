import type { CommissionBreakdown } from '../types/payments.types.js';
import { PAYMENTS_CONSTANTS } from '../constants/payments.constants.js';

export function generatePaymentReference(sequence: number): string {
  const year = new Date().getFullYear();
  return `PAY-${year}-${String(sequence).padStart(6, '0')}`;
}

export function generateInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(sequence).padStart(6, '0')}`;
}

export function decimalToNumber(value: { toNumber(): number } | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

export function calculateCommission(
  grossAmount: number,
  platformFeePercent: number,
  discountAmount = 0,
  taxPercent = 0,
): CommissionBreakdown {
  const platformFee = Math.round((grossAmount * platformFeePercent) / 100 * 100) / 100;
  const taxAmount = Math.round((grossAmount * taxPercent) / 100 * 100) / 100;
  const netAmount = Math.round((grossAmount - platformFee - taxAmount) * 100) / 100;

  return {
    grossAmount,
    platformFeePercent,
    platformFee,
    taxAmount,
    discountAmount,
    netAmount: Math.max(0, netAmount),
  };
}

export function resolvePlatformFeePercent(settingValue: string | null | undefined): number {
  if (!settingValue) {
    return PAYMENTS_CONSTANTS.DEFAULT_PLATFORM_FEE_PERCENT;
  }
  const parsed = Number(settingValue);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
    return PAYMENTS_CONSTANTS.DEFAULT_PLATFORM_FEE_PERCENT;
  }
  return parsed;
}

export function toApiPaymentStatus(status: string): string {
  return status.toLowerCase().replace(/_/g, '_');
}

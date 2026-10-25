import type { WalletTransactionType } from '@prisma/client';

const TYPE_MAP: Record<string, WalletTransactionType> = {
  credit: 'CREDIT',
  debit: 'DEBIT',
  refund: 'REFUND',
  commission: 'COMMISSION',
  withdrawal: 'WITHDRAWAL',
  adjustment: 'ADJUSTMENT',
};

export function mapTransactionTypeFilter(type: string): WalletTransactionType | undefined {
  if (type === 'all') return undefined;
  return TYPE_MAP[type];
}

export function mapPayoutStatusFilter(
  status: string,
): import('@prisma/client').HostPayoutStatus | undefined {
  if (status === 'all') return undefined;
  const map: Record<string, import('@prisma/client').HostPayoutStatus> = {
    pending: 'PENDING',
    processing: 'PROCESSING',
    completed: 'COMPLETED',
    failed: 'FAILED',
    cancelled: 'CANCELLED',
  };
  return map[status];
}

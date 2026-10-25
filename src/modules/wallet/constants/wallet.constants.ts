import { REDIS_CACHE_POLICY } from '@shared/cache/redis-cache-policy.js';

export const WALLET_CONSTANTS = {
  DEFAULT_CURRENCY: 'INR',
  QUEUE_NAME: 'wallet',
  MIN_WITHDRAWAL_AMOUNT: 100,
  MAX_WITHDRAWAL_AMOUNT: 500_000,
  JOB_TYPES: {
    SETTLE_PAYMENT: 'settle_payment',
    PROCESS_SETTLEMENT_BATCH: 'process_settlement_batch',
    REVERSE_REFUND: 'reverse_refund',
  },
  REDIS_KEYS: {
    summary: REDIS_CACHE_POLICY.keys.walletSummary,
    transactions: (userId: string, hash: string) => `cache:wallet:txns:${userId}:${hash}`,
  },
  REDIS_TTL: {
    summary: REDIS_CACHE_POLICY.TTL.SHORT,
    transactions: REDIS_CACHE_POLICY.TTL.SHORT,
  },
  AUDIT_ACTIONS: {
    CREDITED: 'wallet.credited',
    SETTLED: 'wallet.settled',
    WITHDRAWAL_REQUESTED: 'wallet.withdrawal_requested',
    WITHDRAWAL_APPROVED: 'wallet.withdrawal_approved',
    WITHDRAWAL_REJECTED: 'wallet.withdrawal_rejected',
    COMMISSION_RECORDED: 'wallet.commission_recorded',
    REFUND_REVERSED: 'wallet.refund_reversed',
    BANK_ACCOUNT_ADDED: 'wallet.bank_account_added',
    BANK_ACCOUNT_UPDATED: 'wallet.bank_account_updated',
    BANK_ACCOUNT_DELETED: 'wallet.bank_account_deleted',
    BANK_ACCOUNT_VERIFIED: 'wallet.bank_account_verified',
    BANK_ACCOUNT_REJECTED: 'wallet.bank_account_rejected',
  },
  ERROR_CODES: {
    WITHDRAWAL_LIMIT_EXCEEDED: 'WITHDRAWAL_LIMIT_EXCEEDED',
    BANK_ACCOUNT_NOT_VERIFIED: 'BANK_ACCOUNT_NOT_VERIFIED',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  },
} as const;

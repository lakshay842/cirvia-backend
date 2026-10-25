import { describe, it, expect } from 'vitest';
import {
  withdrawalRequestSchema,
  walletTransactionsQuerySchema,
  adminBankAccountListQuerySchema,
  addBankAccountSchema,
} from '../src/modules/wallet/schemas/wallet.schema.js';
import { WALLET_CONSTANTS } from '../src/modules/wallet/constants/wallet.constants.js';
import { maskAccountNumber, decimalToNumber } from '../src/modules/wallet/utils/wallet.util.js';
import { mapTransactionTypeFilter } from '../src/modules/wallet/utils/ledger.util.js';

describe('Wallet schemas', () => {
  it('validates withdrawal request', () => {
    expect(
      withdrawalRequestSchema.safeParse({
        amount: 5000,
        bankAccountId: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true);
  });

  it('rejects unknown withdrawal fields', () => {
    expect(
      withdrawalRequestSchema.safeParse({
        amount: 5000,
        bankAccountId: '550e8400-e29b-41d4-a716-446655440000',
        extra: true,
      }).success,
    ).toBe(false);
  });

  it('validates transactions query defaults', () => {
    const parsed = walletTransactionsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.type).toBe('all');
  });

  it('validates bank account IFSC format', () => {
    expect(
      addBankAccountSchema.safeParse({
        accountHolderName: 'Aarav Sharma',
        bankName: 'HDFC Bank',
        accountNumber: '1234567890',
        ifscCode: 'HDFC0001234',
      }).success,
    ).toBe(true);
  });

  it('validates admin bank account list query defaults', () => {
    const parsed = adminBankAccountListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.status).toBe('pending');
  });
});

describe('Wallet utilities', () => {
  it('masks account numbers', () => {
    expect(maskAccountNumber('1234567890')).toBe('******7890');
  });

  it('maps transaction type filter', () => {
    expect(mapTransactionTypeFilter('credit')).toBe('CREDIT');
    expect(mapTransactionTypeFilter('all')).toBeUndefined();
  });

  it('defines redis summary key', () => {
    expect(WALLET_CONSTANTS.REDIS_KEYS.summary('user-1')).toBe('cache:wallet:summary:user-1');
  });

  it('converts decimal values', () => {
    expect(decimalToNumber({ toNumber: () => 99.5 })).toBe(99.5);
  });
});

import type { HostBankAccount, HostPayout, Wallet, WalletTransaction } from '@prisma/client';
import { decimalToNumber, maskAccountNumber } from '../utils/wallet.util.js';
import type { BankAccountItem, WalletSummary, WalletTransactionItem, WithdrawalItem } from '../types/wallet.types.js';

export function toWalletSummaryDto(wallet: Wallet): WalletSummary {
  return {
    walletId: wallet.id,
    availableBalance: decimalToNumber(wallet.availableBalance),
    pendingBalance: decimalToNumber(wallet.pendingBalance),
    lifetimeEarnings: decimalToNumber(wallet.lifetimeEarnings),
    lifetimeWithdrawals: decimalToNumber(wallet.lifetimeWithdrawals),
    currency: wallet.currency,
  };
}

export function toWalletTransactionDto(txn: WalletTransaction): WalletTransactionItem {
  return {
    id: txn.id,
    type: txn.type,
    amount: decimalToNumber(txn.amount),
    balanceBefore: decimalToNumber(txn.balanceBefore),
    balanceAfter: decimalToNumber(txn.balanceAfter),
    reference: txn.reference,
    description: txn.description,
    paymentId: txn.paymentId,
    createdAt: txn.createdAt.toISOString(),
  };
}

export function toWithdrawalDto(payout: HostPayout): WithdrawalItem {
  return {
    id: payout.id,
    amount: decimalToNumber(payout.amount),
    status: payout.status,
    requestedAt: payout.requestedAt.toISOString(),
    processedAt: payout.processedAt?.toISOString() ?? null,
    transactionReference: payout.transactionReference,
  };
}

export function toBankAccountDto(account: HostBankAccount): BankAccountItem {
  return {
    id: account.id,
    accountHolderName: account.accountHolderName,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    accountNumberMasked: maskAccountNumber(account.accountNumber),
    ifscCode: account.ifscCode,
    upiId: account.upiId,
    isPrimary: account.isPrimary,
    verificationStatus: account.verificationStatus,
  };
}

export function toAdminBankAccountDto(
  account: HostBankAccount & {
    host: {
      id: string;
      displayName: string;
      userId: string;
      user?: { email: string | null; phone: string | null } | null;
    };
    createdAt: Date;
    updatedAt: Date;
  },
) {
  return {
    ...toBankAccountDto(account),
    accountNumber: account.accountNumber,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    host: {
      id: account.host.id,
      displayName: account.host.displayName,
      userId: account.host.userId,
      email: account.host.user?.email ?? null,
      phone: account.host.user?.phone ?? null,
    },
  };
}

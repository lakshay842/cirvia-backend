import type { HostPayoutStatus, WalletTransactionType } from '@prisma/client';

export interface AuditMeta {
  ip?: string;
  browser?: string;
}

export interface WalletSummary {
  walletId: string;
  availableBalance: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  lifetimeWithdrawals: number;
  currency: string;
}

export interface WalletTransactionItem {
  id: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string | null;
  description: string | null;
  paymentId: string | null;
  createdAt: string;
}

export interface WithdrawalItem {
  id: string;
  amount: number;
  status: HostPayoutStatus;
  requestedAt: string;
  processedAt: string | null;
  transactionReference: string | null;
}

export interface BankAccountItem {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  accountNumberMasked: string;
  ifscCode: string;
  upiId: string | null;
  isPrimary: boolean;
  verificationStatus: string;
}

export interface LedgerMutation {
  walletId: string;
  paymentId?: string;
  type: WalletTransactionType;
  amount: number;
  pendingDelta: number;
  availableDelta: number;
  lifetimeEarningsDelta?: number;
  lifetimeWithdrawalsDelta?: number;
  reference?: string;
  description?: string;
}

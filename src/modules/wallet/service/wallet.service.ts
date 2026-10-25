import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@errors/index.js';
import { getRedisClient } from '@redis/index.js';
import { buildPaginationMeta, parsePagination } from '../../../utils/pagination.util.js';
import { WALLET_CONSTANTS } from '../constants/wallet.constants.js';
import {
  toAdminBankAccountDto,
  toBankAccountDto,
  toWalletSummaryDto,
  toWalletTransactionDto,
  toWithdrawalDto,
} from '../dto/wallet.dto.js';
import { emitWalletDomainEvent } from '../events/wallet.events.js';
import { enqueueWalletJob } from '../events/wallet.queue.js';
import { walletRepository } from '../repository/wallet.repository.js';
import { decimalToNumber } from '../utils/wallet.util.js';
import { mapPayoutStatusFilter, mapTransactionTypeFilter } from '../utils/ledger.util.js';
import type { AuditMeta } from '../types/wallet.types.js';
import type {
  AddBankAccountInput,
  AdminBankAccountListQuery,
  AdminPayoutListQuery,
  RejectPayoutInput,
  UpdateBankAccountInput,
  WalletTransactionsQuery,
  WithdrawalRequestInput,
} from '../schemas/wallet.schema.js';

export class WalletService {
  private async writeAudit(
    action: string,
    entityId: string,
    userId?: string,
    changes?: Record<string, unknown>,
    audit?: AuditMeta,
  ): Promise<void> {
    await walletRepository.createAuditLog({
      action,
      entityId,
      ...(userId !== undefined && { userId }),
      ...(changes !== undefined && { changes }),
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
  }

  private async invalidateWalletCache(userId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(WALLET_CONSTANTS.REDIS_KEYS.summary(userId));
    } catch {
      // Redis optional
    }
  }

  private async requireHostUser(userId: string) {
    const host = await walletRepository.findHostByUserId(userId);
    if (!host) {
      throw new ForbiddenError('Host wallet access required.');
    }
    return host;
  }

  async getSummary(userId: string) {
    await this.requireHostUser(userId);

    try {
      const redis = getRedisClient();
      const cached = await redis.get(WALLET_CONSTANTS.REDIS_KEYS.summary(userId));
      if (cached) {
        return JSON.parse(cached) as ReturnType<typeof toWalletSummaryDto>;
      }
    } catch {
      // ignore
    }

    const wallet = await walletRepository.getOrCreateWallet(userId);
    const summary = toWalletSummaryDto(wallet);

    try {
      const redis = getRedisClient();
      await redis.setex(
        WALLET_CONSTANTS.REDIS_KEYS.summary(userId),
        WALLET_CONSTANTS.REDIS_TTL.summary,
        JSON.stringify(summary),
      );
    } catch {
      // ignore
    }

    return summary;
  }

  async getTransactions(userId: string, query: WalletTransactionsQuery) {
    await this.requireHostUser(userId);
    const wallet = await walletRepository.getOrCreateWallet(userId);
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const type = mapTransactionTypeFilter(query.type);

    const { items, total } = await walletRepository.listTransactions({
      walletId: wallet.id,
      ...(type !== undefined && { type }),
      skip,
      take: limit,
    });

    return {
      transactions: items.map((t) => toWalletTransactionDto(t)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getWithdrawalHistory(userId: string, query: WalletTransactionsQuery) {
    const host = await this.requireHostUser(userId);
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });

    const { items, total } = await walletRepository.listWithdrawals(host.id, skip, limit);

    return {
      withdrawals: items.map((w) => toWithdrawalDto(w)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async requestWithdrawal(userId: string, input: WithdrawalRequestInput, audit?: AuditMeta) {
    const host = await this.requireHostUser(userId);

    if (input.amount < WALLET_CONSTANTS.MIN_WITHDRAWAL_AMOUNT) {
      throw new ValidationError(
        `Minimum withdrawal amount is ${WALLET_CONSTANTS.MIN_WITHDRAWAL_AMOUNT}.`,
        { details: { code: WALLET_CONSTANTS.ERROR_CODES.WITHDRAWAL_LIMIT_EXCEEDED } },
      );
    }

    if (input.amount > WALLET_CONSTANTS.MAX_WITHDRAWAL_AMOUNT) {
      throw new ValidationError('Withdrawal amount exceeds platform limit.', {
        details: { code: WALLET_CONSTANTS.ERROR_CODES.WITHDRAWAL_LIMIT_EXCEEDED },
      });
    }

    const bankAccount = await walletRepository.findBankAccount(host.id, input.bankAccountId);
    if (!bankAccount) throw new NotFoundError('Bank account not found.');

    if (bankAccount.verificationStatus !== 'APPROVED') {
      throw new ValidationError('Bank account must be verified before withdrawal.', {
        details: { code: WALLET_CONSTANTS.ERROR_CODES.BANK_ACCOUNT_NOT_VERIFIED },
      });
    }

    const wallet = await walletRepository.getOrCreateWallet(userId);
    const available = decimalToNumber(wallet.availableBalance);
    if (input.amount > available) {
      throw new ValidationError('Insufficient available balance.', {
        details: { code: WALLET_CONSTANTS.ERROR_CODES.INSUFFICIENT_BALANCE },
      });
    }

    let ledgerResult;
    try {
      ledgerResult = await walletRepository.appendLedgerEntry({
        walletId: wallet.id,
        type: 'WITHDRAWAL',
        amount: input.amount,
        availableDelta: -input.amount,
        pendingDelta: 0,
        reference: `withdraw-${Date.now()}`,
        description: `Withdrawal request to ${bankAccount.bankName}`,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
        throw new ValidationError('Insufficient available balance.', {
          details: { code: WALLET_CONSTANTS.ERROR_CODES.INSUFFICIENT_BALANCE },
        });
      }
      throw error;
    }

    const payout = await walletRepository.createWithdrawalRequest({
      hostId: host.id,
      amount: input.amount,
      walletId: wallet.id,
      walletTransactionId: ledgerResult.transaction.id,
    });

    await this.invalidateWalletCache(userId);
    await this.writeAudit(
      WALLET_CONSTANTS.AUDIT_ACTIONS.WITHDRAWAL_REQUESTED,
      wallet.id,
      userId,
      { payoutId: payout.id, amount: input.amount },
      audit,
    );

    emitWalletDomainEvent('wallet.withdrawal_requested', {
      userId,
      payoutId: payout.id,
      amount: input.amount,
    });

    return toWithdrawalDto(payout);
  }

  async creditHostEarningsFromPayment(paymentId: string): Promise<void> {
    const payment = await walletRepository.findPaymentForWallet(paymentId);
    if (!payment || payment.paymentStatus !== 'CAPTURED') return;

    const hostUserId = payment.host.userId;
    const netAmount = decimalToNumber(payment.netAmount);
    const platformFee = decimalToNumber(payment.platformFee);

    if (netAmount <= 0) return;

    const alreadyCredited = await walletRepository.hasLedgerEntryForPayment(paymentId, 'CREDIT');
    if (alreadyCredited) return;

    const wallet = await walletRepository.getOrCreateWallet(hostUserId, payment.currency);

    await walletRepository.appendLedgerEntry({
      walletId: wallet.id,
      paymentId,
      type: 'CREDIT',
      amount: netAmount,
      pendingDelta: netAmount,
      availableDelta: 0,
      lifetimeEarningsDelta: netAmount,
      reference: payment.paymentReference,
      description: `Earnings from booking — pending until event completion`,
    });

    if (platformFee > 0) {
      await walletRepository.appendLedgerEntry({
        walletId: wallet.id,
        paymentId,
        type: 'COMMISSION',
        amount: platformFee,
        pendingDelta: 0,
        availableDelta: 0,
        reference: payment.paymentReference,
        description: 'Platform commission',
      });

      await this.writeAudit(WALLET_CONSTANTS.AUDIT_ACTIONS.COMMISSION_RECORDED, wallet.id, hostUserId, {
        paymentId,
        platformFee,
      });
    }

    await this.invalidateWalletCache(hostUserId);
    await this.writeAudit(WALLET_CONSTANTS.AUDIT_ACTIONS.CREDITED, wallet.id, hostUserId, {
      paymentId,
      netAmount,
      pending: true,
    });

    emitWalletDomainEvent('wallet.credited', { paymentId, hostUserId, netAmount });

    const eventEnd = payment.booking.event.eventEnd;
    if (eventEnd <= new Date()) {
      await this.settlePayment(paymentId);
    } else {
      await enqueueWalletJob(paymentId, WALLET_CONSTANTS.JOB_TYPES.SETTLE_PAYMENT, {
        runAfter: eventEnd.toISOString(),
      });
    }
  }

  async settlePayment(paymentId: string): Promise<void> {
    const payment = await walletRepository.findPaymentForWallet(paymentId);
    if (!payment || payment.paymentStatus !== 'CAPTURED') return;

    if (payment.booking.event.eventEnd > new Date()) {
      return;
    }

    const hostUserId = payment.host.userId;
    const netAmount = decimalToNumber(payment.netAmount);
    if (netAmount <= 0) return;

    const settled = await walletRepository.hasSettlementForPayment(paymentId);
    if (settled) return;

    const wallet = await walletRepository.getOrCreateWallet(hostUserId, payment.currency);
    const pending = decimalToNumber(wallet.pendingBalance);
    if (pending < netAmount) {
      return;
    }

    await walletRepository.appendLedgerEntry({
      walletId: wallet.id,
      paymentId,
      type: 'ADJUSTMENT',
      amount: netAmount,
      pendingDelta: -netAmount,
      availableDelta: netAmount,
      reference: payment.paymentReference,
      description: 'Settlement — funds moved to available balance',
    });

    await this.invalidateWalletCache(hostUserId);
    await this.writeAudit(WALLET_CONSTANTS.AUDIT_ACTIONS.SETTLED, wallet.id, hostUserId, {
      paymentId,
      netAmount,
    });

    emitWalletDomainEvent('wallet.settled', { paymentId, hostUserId, netAmount });
  }

  async processSettlementBatch(): Promise<number> {
    const payments = await walletRepository.findSettleablePayments();
    let count = 0;
    for (const payment of payments) {
      await this.settlePayment(payment.id);
      count += 1;
    }
    return count;
  }

  async reverseHostEarningsFromPayment(paymentId: string): Promise<void> {
    const payment = await walletRepository.findPaymentForWallet(paymentId);
    if (!payment) return;

    const hostUserId = payment.host.userId;
    const netAmount = decimalToNumber(payment.netAmount);
    const wallet = await walletRepository.findWalletByUserId(hostUserId);
    if (!wallet) return;

    const alreadyReversed = await walletRepository.hasLedgerEntryForPayment(paymentId, 'REFUND');
    if (alreadyReversed) return;

    const available = decimalToNumber(wallet.availableBalance);
    const pending = decimalToNumber(wallet.pendingBalance);
    const fromAvailable = Math.min(netAmount, available);
    const fromPending = Math.min(netAmount - fromAvailable, pending);

    await walletRepository.appendLedgerEntry({
      walletId: wallet.id,
      paymentId,
      type: 'REFUND',
      amount: netAmount,
      availableDelta: -fromAvailable,
      pendingDelta: -fromPending,
      lifetimeEarningsDelta: -netAmount,
      reference: payment.paymentReference,
      description: 'Payment refund — earnings reversed',
    });

    await this.invalidateWalletCache(hostUserId);
    await this.writeAudit(WALLET_CONSTANTS.AUDIT_ACTIONS.REFUND_REVERSED, wallet.id, hostUserId, {
      paymentId,
      netAmount,
    });

    emitWalletDomainEvent('wallet.refund_reversed', { paymentId, hostUserId });
  }

  async listBankAccounts(userId: string) {
    const host = await this.requireHostUser(userId);
    const accounts = await walletRepository.listBankAccounts(host.id);
    return accounts.map((a) => toBankAccountDto(a));
  }

  async addBankAccount(userId: string, input: AddBankAccountInput, audit?: AuditMeta) {
    const host = await this.requireHostUser(userId);
    const account = await walletRepository.createBankAccount(host.id, {
      accountHolderName: input.accountHolderName,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      ifscCode: input.ifscCode,
      ...(input.upiId !== undefined && { upiId: input.upiId }),
      isPrimary: input.isPrimary,
    });

    await this.writeAudit(
      WALLET_CONSTANTS.AUDIT_ACTIONS.BANK_ACCOUNT_ADDED,
      account.id,
      userId,
      { hostId: host.id },
      audit,
    );

    return toBankAccountDto(account);
  }

  async updateBankAccount(
    userId: string,
    bankAccountId: string,
    input: UpdateBankAccountInput,
    audit?: AuditMeta,
  ) {
    const host = await this.requireHostUser(userId);
    const existing = await walletRepository.findBankAccount(host.id, bankAccountId);
    if (!existing) throw new NotFoundError('Bank account not found.');

    const updated = await walletRepository.updateBankAccount(host.id, bankAccountId, {
      ...(input.accountHolderName !== undefined && { accountHolderName: input.accountHolderName }),
      ...(input.bankName !== undefined && { bankName: input.bankName }),
      ...(input.upiId !== undefined && { upiId: input.upiId }),
      ...(input.isPrimary !== undefined && { isPrimary: input.isPrimary }),
    });

    await this.writeAudit(
      WALLET_CONSTANTS.AUDIT_ACTIONS.BANK_ACCOUNT_UPDATED,
      bankAccountId,
      userId,
      {},
      audit,
    );

    return toBankAccountDto(updated);
  }

  async deleteBankAccount(userId: string, bankAccountId: string, audit?: AuditMeta) {
    const host = await this.requireHostUser(userId);
    const result = await walletRepository.deleteBankAccount(host.id, bankAccountId);
    if (result.count === 0) throw new NotFoundError('Bank account not found.');

    await this.writeAudit(
      WALLET_CONSTANTS.AUDIT_ACTIONS.BANK_ACCOUNT_DELETED,
      bankAccountId,
      userId,
      {},
      audit,
    );
  }

  async getAdminWalletOverview() {
    return walletRepository.getAdminWalletOverview();
  }

  async listAdminPayouts(query: AdminPayoutListQuery) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const status = mapPayoutStatusFilter(query.status);

    const { items, total } = await walletRepository.listAdminPayouts({
      ...(status !== undefined && { status }),
      skip,
      take: limit,
    });

    return {
      payouts: items.map((p) => ({
        ...toWithdrawalDto(p),
        host: { id: p.host.id, displayName: p.host.displayName, userId: p.host.userId },
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async approvePayout(adminUserId: string, payoutId: string, audit?: AuditMeta) {
    const payout = await walletRepository.findPayoutById(payoutId);
    if (!payout) throw new NotFoundError('Payout not found.');
    if (payout.status !== 'PENDING' && payout.status !== 'PROCESSING') {
      throw new ConflictError('Payout cannot be approved in its current status.');
    }

    const wallet = await walletRepository.findWalletByUserId(payout.host.userId);
    if (!wallet) throw new NotFoundError('Wallet not found.');

    const amount = decimalToNumber(payout.amount);
    const reference = `payout-${payoutId.slice(0, 8)}`;

    await walletRepository.appendLedgerEntry({
      walletId: wallet.id,
      type: 'DEBIT',
      amount: 0,
      availableDelta: 0,
      pendingDelta: 0,
      lifetimeWithdrawalsDelta: amount,
      reference,
      description: 'Withdrawal approved — funds disbursed',
    });

    const updated = await walletRepository.updatePayoutStatus(payoutId, 'COMPLETED', reference);

    await this.invalidateWalletCache(payout.host.userId);
    await this.writeAudit(
      WALLET_CONSTANTS.AUDIT_ACTIONS.WITHDRAWAL_APPROVED,
      payoutId,
      adminUserId,
      { amount },
      audit,
    );

    emitWalletDomainEvent('wallet.withdrawal_approved', { payoutId, adminUserId });

    return toWithdrawalDto(updated);
  }

  async rejectPayout(adminUserId: string, payoutId: string, input: RejectPayoutInput, audit?: AuditMeta) {
    const payout = await walletRepository.findPayoutById(payoutId);
    if (!payout) throw new NotFoundError('Payout not found.');
    if (payout.status !== 'PENDING' && payout.status !== 'PROCESSING') {
      throw new ConflictError('Payout cannot be rejected in its current status.');
    }

    const wallet = await walletRepository.findWalletByUserId(payout.host.userId);
    if (!wallet) throw new NotFoundError('Wallet not found.');

    const amount = decimalToNumber(payout.amount);

    await walletRepository.appendLedgerEntry({
      walletId: wallet.id,
      type: 'ADJUSTMENT',
      amount,
      availableDelta: amount,
      pendingDelta: 0,
      reference: `reject-${payoutId.slice(0, 8)}`,
      description: input.reason ?? 'Withdrawal rejected — funds restored',
    });

    const updated = await walletRepository.updatePayoutStatus(payoutId, 'CANCELLED');

    await this.invalidateWalletCache(payout.host.userId);
    await this.writeAudit(
      WALLET_CONSTANTS.AUDIT_ACTIONS.WITHDRAWAL_REJECTED,
      payoutId,
      adminUserId,
      { reason: input.reason },
      audit,
    );

    emitWalletDomainEvent('wallet.withdrawal_rejected', { payoutId, adminUserId });

    return toWithdrawalDto(updated);
  }

  async listAdminBankAccounts(query: AdminBankAccountListQuery) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const statusMap = {
      pending: 'PENDING',
      approved: 'APPROVED',
      rejected: 'REJECTED',
      all: undefined,
    } as const;
    const verificationStatus = statusMap[query.status];

    const { items, total } = await walletRepository.listAdminBankAccounts({
      ...(verificationStatus !== undefined && { verificationStatus }),
      skip,
      take: limit,
    });

    return {
      accounts: items.map((account) => toAdminBankAccountDto(account)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getAdminBankAccount(bankAccountId: string) {
    const account = await walletRepository.findBankAccountById(bankAccountId);
    if (!account) throw new NotFoundError('Bank account not found.');
    return toAdminBankAccountDto(account);
  }

  async verifyBankAccount(adminUserId: string, bankAccountId: string, audit?: AuditMeta) {
    const account = await walletRepository.findBankAccountById(bankAccountId);
    if (!account) throw new NotFoundError('Bank account not found.');
    if (account.verificationStatus !== 'PENDING') {
      throw new ConflictError('Bank account is not pending verification.');
    }

    const updated = await walletRepository.updateBankAccountVerification(bankAccountId, 'APPROVED');

    await this.writeAudit(
      WALLET_CONSTANTS.AUDIT_ACTIONS.BANK_ACCOUNT_VERIFIED,
      bankAccountId,
      adminUserId,
      { hostId: account.hostId },
      audit,
    );

    return toAdminBankAccountDto(updated);
  }

  async rejectBankAccount(
    adminUserId: string,
    bankAccountId: string,
    input: RejectPayoutInput,
    audit?: AuditMeta,
  ) {
    const account = await walletRepository.findBankAccountById(bankAccountId);
    if (!account) throw new NotFoundError('Bank account not found.');
    if (account.verificationStatus !== 'PENDING') {
      throw new ConflictError('Bank account is not pending verification.');
    }

    const updated = await walletRepository.updateBankAccountVerification(bankAccountId, 'REJECTED');

    await this.writeAudit(
      WALLET_CONSTANTS.AUDIT_ACTIONS.BANK_ACCOUNT_REJECTED,
      bankAccountId,
      adminUserId,
      { hostId: account.hostId, reason: input.reason },
      audit,
    );

    return toAdminBankAccountDto(updated);
  }
}

export const walletService = new WalletService();

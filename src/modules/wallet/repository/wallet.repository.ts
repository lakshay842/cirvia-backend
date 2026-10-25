import { prisma } from '@database/index.js';
import type { HostPayoutStatus, Prisma, WalletTransactionType } from '@prisma/client';
import type { LedgerMutation } from '../types/wallet.types.js';

export class WalletRepository {
  async findHostByUserId(userId: string) {
    return prisma.hostProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true, userId: true, displayName: true },
    });
  }

  async findWalletByUserId(userId: string) {
    return prisma.wallet.findUnique({ where: { userId } });
  }

  async getOrCreateWallet(userId: string, currency = 'INR') {
    const existing = await prisma.wallet.findUnique({ where: { userId } });
    if (existing) return existing;

    return prisma.wallet.create({
      data: { userId, currency },
    });
  }

  async findPaymentForWallet(paymentId: string) {
    return prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
      include: {
        booking: {
          include: {
            event: { select: { id: true, eventEnd: true, title: true } },
          },
        },
        host: { select: { id: true, userId: true } },
      },
    });
  }

  async hasLedgerEntryForPayment(paymentId: string, type: WalletTransactionType) {
    const count = await prisma.walletTransaction.count({
      where: { paymentId, type },
    });
    return count > 0;
  }

  async appendLedgerEntry(mutation: LedgerMutation) {
    return prisma.$transaction(async (tx) => {
      const wallets = await tx.$queryRaw<Array<{
        id: string;
        available_balance: Prisma.Decimal;
        pending_balance: Prisma.Decimal;
        lifetime_earnings: Prisma.Decimal;
        lifetime_withdrawals: Prisma.Decimal;
      }>>`
        SELECT id, available_balance, pending_balance, lifetime_earnings, lifetime_withdrawals
        FROM wallets
        WHERE id = ${mutation.walletId}::uuid
        FOR UPDATE
      `;

      const row = wallets[0];
      if (!row) {
        throw new Error('Wallet not found');
      }

      const availableBefore = Number(row.available_balance);
      const pendingBefore = Number(row.pending_balance);
      const availableAfter = availableBefore + mutation.availableDelta;
      const pendingAfter = pendingBefore + mutation.pendingDelta;

      if (availableAfter < 0 || pendingAfter < 0) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const updated = await tx.wallet.update({
        where: { id: mutation.walletId },
        data: {
          availableBalance: availableAfter,
          pendingBalance: pendingAfter,
          ...(mutation.lifetimeEarningsDelta !== undefined && {
            lifetimeEarnings: Number(row.lifetime_earnings) + mutation.lifetimeEarningsDelta,
          }),
          ...(mutation.lifetimeWithdrawalsDelta !== undefined && {
            lifetimeWithdrawals:
              Number(row.lifetime_withdrawals) + mutation.lifetimeWithdrawalsDelta,
          }),
        },
      });

      const balanceBefore = availableBefore + pendingBefore;
      const balanceAfter = availableAfter + pendingAfter;

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: mutation.walletId,
          ...(mutation.paymentId !== undefined && { paymentId: mutation.paymentId }),
          type: mutation.type,
          amount: mutation.amount,
          balanceBefore,
          balanceAfter,
          ...(mutation.reference !== undefined && { reference: mutation.reference }),
          ...(mutation.description !== undefined && { description: mutation.description }),
        },
      });

      return { wallet: updated, transaction };
    });
  }

  async listTransactions(params: {
    walletId: string;
    type?: WalletTransactionType;
    skip: number;
    take: number;
  }) {
    const where: Prisma.WalletTransactionWhereInput = {
      walletId: params.walletId,
      ...(params.type !== undefined && { type: params.type }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    return { items, total };
  }

  async listWithdrawals(hostId: string, skip: number, take: number) {
    const where = { hostId };
    const [items, total] = await prisma.$transaction([
      prisma.hostPayout.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip,
        take,
      }),
      prisma.hostPayout.count({ where }),
    ]);
    return { items, total };
  }

  async listAdminPayouts(params: {
    status?: HostPayoutStatus;
    skip: number;
    take: number;
  }) {
    const where: Prisma.HostPayoutWhereInput = {
      ...(params.status !== undefined && { status: params.status }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.hostPayout.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip: params.skip,
        take: params.take,
        include: {
          host: { select: { id: true, displayName: true, userId: true } },
          walletTransaction: true,
        },
      }),
      prisma.hostPayout.count({ where }),
    ]);

    return { items, total };
  }

  async findPayoutById(payoutId: string) {
    return prisma.hostPayout.findUnique({
      where: { id: payoutId },
      include: {
        host: { select: { id: true, userId: true } },
        walletTransaction: true,
      },
    });
  }

  async createWithdrawalRequest(params: {
    hostId: string;
    amount: number;
    walletId: string;
    walletTransactionId: string;
  }) {
    return prisma.hostPayout.create({
      data: {
        hostId: params.hostId,
        amount: params.amount,
        walletTransactionId: params.walletTransactionId,
        status: 'PENDING',
      },
    });
  }

  async updatePayoutStatus(
    payoutId: string,
    status: HostPayoutStatus,
    transactionReference?: string,
  ) {
    return prisma.hostPayout.update({
      where: { id: payoutId },
      data: {
        status,
        processedAt: new Date(),
        ...(transactionReference !== undefined && { transactionReference }),
      },
    });
  }

  async hasSettlementForPayment(paymentId: string) {
    const count = await prisma.walletTransaction.count({
      where: {
        paymentId,
        type: 'ADJUSTMENT',
        description: { contains: 'Settlement' },
      },
    });
    return count > 0;
  }

  async findBankAccount(hostId: string, bankAccountId: string) {
    return prisma.hostBankAccount.findFirst({
      where: { id: bankAccountId, hostId },
    });
  }

  async listBankAccounts(hostId: string) {
    return prisma.hostBankAccount.findMany({
      where: { hostId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createBankAccount(hostId: string, data: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
    isPrimary: boolean;
  }) {
    return prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.hostBankAccount.updateMany({
          where: { hostId },
          data: { isPrimary: false },
        });
      }

      return tx.hostBankAccount.create({
        data: {
          hostId,
          accountHolderName: data.accountHolderName,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode,
          ...(data.upiId !== undefined && { upiId: data.upiId }),
          isPrimary: data.isPrimary,
          verificationStatus: 'PENDING',
        },
      });
    });
  }

  async updateBankAccount(
    hostId: string,
    bankAccountId: string,
    data: {
      accountHolderName?: string;
      bankName?: string;
      upiId?: string | null;
      isPrimary?: boolean;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.hostBankAccount.updateMany({
          where: { hostId },
          data: { isPrimary: false },
        });
      }

      return tx.hostBankAccount.update({
        where: { id: bankAccountId },
        data: {
          ...(data.accountHolderName !== undefined && {
            accountHolderName: data.accountHolderName,
          }),
          ...(data.bankName !== undefined && { bankName: data.bankName }),
          ...(data.upiId !== undefined && { upiId: data.upiId }),
          ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        },
      });
    });
  }

  async deleteBankAccount(hostId: string, bankAccountId: string) {
    return prisma.hostBankAccount.deleteMany({
      where: { id: bankAccountId, hostId },
    });
  }

  async findBankAccountById(bankAccountId: string) {
    return prisma.hostBankAccount.findUnique({
      where: { id: bankAccountId },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            userId: true,
            user: { select: { email: true, phone: true } },
          },
        },
      },
    });
  }

  async updateBankAccountVerification(
    bankAccountId: string,
    verificationStatus: 'APPROVED' | 'REJECTED',
  ) {
    return prisma.hostBankAccount.update({
      where: { id: bankAccountId },
      data: { verificationStatus },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            userId: true,
            user: { select: { email: true, phone: true } },
          },
        },
      },
    });
  }

  async listAdminBankAccounts(options: {
    verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    skip: number;
    take: number;
  }) {
    const where = options.verificationStatus
      ? { verificationStatus: options.verificationStatus }
      : {};

    const [items, total] = await Promise.all([
      prisma.hostBankAccount.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { createdAt: 'desc' },
        include: {
          host: {
            select: {
              id: true,
              displayName: true,
              userId: true,
              user: { select: { email: true, phone: true } },
            },
          },
        },
      }),
      prisma.hostBankAccount.count({ where }),
    ]);

    return { items, total };
  }

  async findSettleablePayments(limit = 50) {
    return prisma.payment.findMany({
      where: {
        paymentStatus: 'CAPTURED',
        deletedAt: null,
        booking: {
          event: {
            eventEnd: { lte: new Date() },
          },
        },
      },
      take: limit,
      include: {
        host: { select: { userId: true } },
        booking: { include: { event: { select: { eventEnd: true } } } },
      },
    });
  }

  async createAuditLog(params: {
    action: string;
    entityId: string;
    userId?: string;
    changes?: Record<string, unknown>;
    ip?: string;
    browser?: string;
  }) {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: 'wallet',
        entityId: params.entityId,
        ...(params.userId && { userId: params.userId }),
        ...(params.changes && { changes: params.changes as Prisma.InputJsonValue }),
        ...(params.ip && { ip: params.ip }),
        ...(params.browser && { browser: params.browser }),
      },
    });
  }

  async getAdminWalletOverview() {
    const [
      walletAgg,
      paymentAgg,
      pendingBankAccounts,
      approvedBankAccounts,
      pendingPayouts,
      processingPayouts,
      completedPayouts,
      pendingPayoutAmount,
      completedPayoutAmount,
      walletsWithBalance,
    ] = await Promise.all([
      prisma.wallet.aggregate({
        _sum: {
          availableBalance: true,
          pendingBalance: true,
          lifetimeEarnings: true,
          lifetimeWithdrawals: true,
        },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { deletedAt: null, paymentStatus: 'CAPTURED' },
        _sum: { amount: true, platformFee: true, netAmount: true },
        _count: true,
      }),
      prisma.hostBankAccount.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.hostBankAccount.count({ where: { verificationStatus: 'APPROVED' } }),
      prisma.hostPayout.count({ where: { status: 'PENDING' } }),
      prisma.hostPayout.count({ where: { status: 'PROCESSING' } }),
      prisma.hostPayout.count({ where: { status: 'COMPLETED' } }),
      prisma.hostPayout.aggregate({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
        _sum: { amount: true },
      }),
      prisma.hostPayout.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.wallet.count({
        where: {
          OR: [{ availableBalance: { gt: 0 } }, { pendingBalance: { gt: 0 } }],
        },
      }),
    ]);

    return {
      currency: 'INR',
      hostsWithWallets: walletAgg._count,
      hostsWithBalance: walletsWithBalance,
      totalAvailableBalance: Number(walletAgg._sum.availableBalance ?? 0),
      totalPendingBalance: Number(walletAgg._sum.pendingBalance ?? 0),
      totalLifetimeEarnings: Number(walletAgg._sum.lifetimeEarnings ?? 0),
      totalLifetimeWithdrawals: Number(walletAgg._sum.lifetimeWithdrawals ?? 0),
      paymentsCaptured: paymentAgg._count,
      guestPaymentsTotal: Number(paymentAgg._sum.amount ?? 0),
      platformFeesCollected: Number(paymentAgg._sum.platformFee ?? 0),
      hostEarningsTotal: Number(paymentAgg._sum.netAmount ?? 0),
      pendingBankAccounts,
      approvedBankAccounts,
      pendingPayouts,
      processingPayouts,
      completedPayouts,
      pendingPayoutAmount: Number(pendingPayoutAmount._sum.amount ?? 0),
      completedPayoutAmount: Number(completedPayoutAmount._sum.amount ?? 0),
    };
  }
}

export const walletRepository = new WalletRepository();

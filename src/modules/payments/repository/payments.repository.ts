import { prisma } from '@database/index.js';
import type { PaymentStatus, Prisma, RefundStatus } from '@prisma/client';
import { ConflictError, NotFoundError } from '@errors/index.js';
import { bookingsRepository } from '../../bookings/repository/bookings.repository.js';
import { PAYMENTS_CONSTANTS } from '../constants/payments.constants.js';

const notDeleted = { deletedAt: null } as const;

const paymentDetailsInclude = {
  booking: {
    select: {
      bookingReference: true,
      event: { select: { title: true, eventEnd: true } },
    },
  },
  refunds: { orderBy: { createdAt: 'desc' as const }, take: 1 },
  invoice: true,
} satisfies Prisma.PaymentInclude;

export class PaymentsRepository {
  async countPaymentsForReference(): Promise<number> {
    return prisma.payment.count();
  }

  async countInvoices(): Promise<number> {
    return prisma.invoice.count();
  }

  async getPlatformFeePercent(): Promise<string | null> {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: PAYMENTS_CONSTANTS.PLATFORM_FEE_SETTING_KEY },
    });
    return setting?.value ?? null;
  }

  async findBookingForPayment(bookingId: string, userId: string) {
    return prisma.eventBooking.findFirst({
      where: { id: bookingId, userId, ...notDeleted },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            hostId: true,
            eventEnd: true,
            host: { select: { id: true, userId: true } },
          },
        },
        payment: true,
      },
    });
  }

  async findPaymentByBookingId(bookingId: string) {
    return prisma.payment.findFirst({
      where: { bookingId, ...notDeleted },
      include: paymentDetailsInclude,
    });
  }

  async findPaymentById(paymentId: string) {
    return prisma.payment.findFirst({
      where: { id: paymentId, ...notDeleted },
      include: paymentDetailsInclude,
    });
  }

  async findPaymentForUser(paymentId: string, userId: string) {
    return prisma.payment.findFirst({
      where: { id: paymentId, userId, ...notDeleted },
      include: paymentDetailsInclude,
    });
  }

  async findPaymentByGatewayOrder(orderId: string) {
    return prisma.paymentTransaction.findFirst({
      where: {
        gatewayReference: orderId,
        transactionType: 'PAYMENT',
      },
      include: {
        payment: {
          include: {
            booking: {
              include: {
                event: { select: { id: true, hostId: true, eventEnd: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTransactionByGatewayRef(gatewayReference: string) {
    return prisma.paymentTransaction.findFirst({
      where: { gatewayReference },
    });
  }

  async listUserPayments(params: {
    userId: string;
    statuses?: PaymentStatus[];
    skip: number;
    take: number;
  }) {
    const where: Prisma.PaymentWhereInput = {
      userId: params.userId,
      ...notDeleted,
      ...(params.statuses && { paymentStatus: { in: params.statuses } }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.payment.count({ where }),
    ]);

    return { items, total };
  }

  async listAdminPayments(params: {
    statuses?: PaymentStatus[];
    userId?: string;
    hostId?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.PaymentWhereInput = {
      ...notDeleted,
      ...(params.statuses && { paymentStatus: { in: params.statuses } }),
      ...(params.userId && { userId: params.userId }),
      ...(params.hostId && { hostId: params.hostId }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
        include: paymentDetailsInclude,
      }),
      prisma.payment.count({ where }),
    ]);

    return { items, total };
  }

  async createPaymentWithOrder(params: {
    bookingId: string;
    userId: string;
    hostId: string;
    paymentReference: string;
    amount: number;
    platformFee: number;
    taxAmount: number;
    discountAmount: number;
    netAmount: number;
    currency: string;
    gateway: string;
    orderId: string;
    orderPayload: Record<string, unknown>;
  }) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          bookingId: params.bookingId,
          userId: params.userId,
          hostId: params.hostId,
          gateway: params.gateway,
          paymentReference: params.paymentReference,
          amount: params.amount,
          platformFee: params.platformFee,
          taxAmount: params.taxAmount,
          discountAmount: params.discountAmount,
          netAmount: params.netAmount,
          currency: params.currency,
          paymentStatus: 'PENDING',
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          transactionType: 'PAYMENT',
          gatewayReference: params.orderId,
          amount: params.amount,
          status: 'PENDING',
          requestPayload: params.orderPayload as Prisma.InputJsonValue,
        },
      });

      return payment;
    });
  }

  async updatePaymentOrder(params: {
    paymentId: string;
    orderId: string;
    amount: number;
    platformFee: number;
    taxAmount: number;
    discountAmount: number;
    netAmount: number;
    orderPayload: Record<string, unknown>;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: params.paymentId },
        data: {
          paymentStatus: 'PENDING',
          amount: params.amount,
          platformFee: params.platformFee,
          taxAmount: params.taxAmount,
          discountAmount: params.discountAmount,
          netAmount: params.netAmount,
          failedAt: null,
          failureReason: null,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: params.paymentId,
          transactionType: 'PAYMENT',
          gatewayReference: params.orderId,
          amount: params.amount,
          status: 'PENDING',
          requestPayload: params.orderPayload as Prisma.InputJsonValue,
        },
      });
    });
  }

  async capturePayment(params: {
    paymentId: string;
    bookingId: string;
    gatewayPaymentId: string;
    gatewayOrderId: string;
    paymentMethod?: string;
    responsePayload: Record<string, unknown>;
    invoiceNumber: string;
    billingName: string;
    billingAddress: string;
    settlementPayload: Record<string, unknown>;
  }): Promise<{
    payment: Prisma.PaymentGetPayload<{ include: typeof paymentDetailsInclude }>;
    newlyCaptured: boolean;
  }> {
    return prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; payment_status: string }>>`
        SELECT id, payment_status
        FROM payments
        WHERE id = ${params.paymentId}::uuid
          AND deleted_at IS NULL
        FOR UPDATE
      `;

      const current = locked[0];
      if (!current) {
        throw new Error('Payment not found.');
      }

      if (current.payment_status === 'CAPTURED') {
        const existing = await tx.payment.findUnique({
          where: { id: params.paymentId },
          include: paymentDetailsInclude,
        });
        if (!existing) {
          throw new Error('Payment not found.');
        }
        return { payment: existing, newlyCaptured: false };
      }

      const booking = await tx.eventBooking.findFirst({
        where: { id: params.bookingId, ...notDeleted },
      });
      if (!booking) {
        throw new NotFoundError('Booking not found.');
      }

      // Unpaid bookings do not reserve seats — claim capacity when payment succeeds.
      if (booking.bookingStatus === 'PENDING_PAYMENT') {
        const claim = await bookingsRepository.claimCapacityForBooking(
          tx,
          booking.eventId,
          booking.guestsCount,
        );
        if (claim === 'NOT_FOUND') {
          throw new NotFoundError('Event not found.');
        }
        if (claim === 'EVENT_FULL') {
          throw new ConflictError(
            'This event is fully booked. Payment cannot be confirmed for this booking.',
            { code: 'EVENT_FULL' },
          );
        }
      }

      const payment = await tx.payment.update({
        where: { id: params.paymentId },
        data: {
          paymentStatus: 'CAPTURED',
          gatewayTransactionId: params.gatewayPaymentId,
          paymentMethod: params.paymentMethod ?? 'razorpay',
          paidAt: new Date(),
        },
        include: paymentDetailsInclude,
      });

      await tx.eventBooking.update({
        where: { id: params.bookingId },
        data: {
          bookingStatus: 'CONFIRMED',
          paymentStatus: 'CAPTURED',
          expiresAt: null,
        },
      });

      await tx.paymentTransaction.updateMany({
        where: {
          paymentId: params.paymentId,
          gatewayReference: params.gatewayOrderId,
        },
        data: {
          status: 'CAPTURED',
          responsePayload: params.responsePayload as Prisma.InputJsonValue,
          processedAt: new Date(),
        },
      });

      const existingPayoutTxn = await tx.paymentTransaction.findFirst({
        where: {
          paymentId: params.paymentId,
          transactionType: 'PAYOUT',
        },
      });

      if (!existingPayoutTxn) {
        await tx.paymentTransaction.create({
          data: {
            paymentId: params.paymentId,
            transactionType: 'PAYOUT',
            amount: payment.netAmount,
            status: 'PENDING',
            requestPayload: params.settlementPayload as Prisma.InputJsonValue,
          },
        });
      }

      const existingInvoice = await tx.invoice.findFirst({
        where: { paymentId: params.paymentId },
      });

      if (!existingInvoice) {
        await tx.invoice.create({
          data: {
            paymentId: params.paymentId,
            invoiceNumber: params.invoiceNumber,
            invoiceUrl: null,
            billingName: params.billingName,
            billingAddress: params.billingAddress,
          },
        });
      }

      const existingHistory = await tx.bookingHistory.findFirst({
        where: {
          bookingId: params.bookingId,
          action: 'PAYMENT_CONFIRMED',
        },
      });

      if (!existingHistory) {
        await tx.bookingHistory.create({
          data: {
            bookingId: params.bookingId,
            action: 'PAYMENT_CONFIRMED',
            metadata: { paymentId: params.paymentId },
          },
        });
      }

      return { payment, newlyCaptured: true };
    });
  }

  async failPayment(params: {
    paymentId: string;
    bookingId: string;
    reason: string;
    gatewayOrderId?: string;
    responsePayload?: Record<string, unknown>;
  }) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: params.paymentId },
        data: {
          paymentStatus: 'FAILED',
          failedAt: new Date(),
          failureReason: params.reason,
        },
      });

      await tx.eventBooking.update({
        where: { id: params.bookingId },
        data: { paymentStatus: 'FAILED' },
      });

      if (params.gatewayOrderId) {
        await tx.paymentTransaction.updateMany({
          where: {
            paymentId: params.paymentId,
            gatewayReference: params.gatewayOrderId,
          },
          data: {
            status: 'FAILED',
            responsePayload: (params.responsePayload ?? {}) as Prisma.InputJsonValue,
            processedAt: new Date(),
          },
        });
      }

      return payment;
    });
  }

  async cancelPayment(paymentId: string, bookingId: string) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: paymentId },
        data: { paymentStatus: 'CANCELLED' },
      });

      const booking = await tx.eventBooking.findUnique({ where: { id: bookingId } });
      if (booking && booking.paymentStatus !== 'CAPTURED') {
        await tx.eventBooking.update({
          where: { id: bookingId },
          data: { paymentStatus: 'CANCELLED' },
        });
      }

      return payment;
    });
  }

  async createRefundRequest(params: {
    paymentId: string;
    bookingId: string;
    requestedBy: string;
    reason: string;
    refundAmount: number;
  }) {
    return prisma.refund.create({
      data: {
        paymentId: params.paymentId,
        bookingId: params.bookingId,
        requestedBy: params.requestedBy,
        reason: params.reason,
        refundAmount: params.refundAmount,
        status: 'PENDING',
      },
    });
  }

  async findLatestRefund(paymentId: string) {
    return prisma.refund.findFirst({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async processRefund(params: {
    refundId: string;
    paymentId: string;
    bookingId: string;
    approvedBy: string;
    gatewayReference: string;
    refundPayload: Record<string, unknown>;
  }) {
    return prisma.$transaction(async (tx) => {
      const refund = await tx.refund.update({
        where: { id: params.refundId },
        data: {
          status: 'PROCESSED',
          approvedBy: params.approvedBy,
          gatewayReference: params.gatewayReference,
          processedAt: new Date(),
        },
      });

      await tx.payment.update({
        where: { id: params.paymentId },
        data: { paymentStatus: 'REFUNDED' },
      });

      await tx.eventBooking.update({
        where: { id: params.bookingId },
        data: {
          bookingStatus: 'REFUNDED',
          paymentStatus: 'REFUNDED',
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: params.paymentId,
          transactionType: 'REFUND',
          gatewayReference: params.gatewayReference,
          amount: refund.refundAmount,
          status: 'REFUNDED',
          responsePayload: params.refundPayload as Prisma.InputJsonValue,
          processedAt: new Date(),
        },
      });

      return refund;
    });
  }

  async failRefund(refundId: string, status: RefundStatus = 'FAILED') {
    return prisma.refund.update({
      where: { id: refundId },
      data: { status },
    });
  }

  async findLatestPaymentTransaction(paymentId: string, transactionType: 'PAYMENT' | 'REFUND' | 'PAYOUT' = 'PAYMENT') {
    return prisma.paymentTransaction.findFirst({
      where: { paymentId, transactionType },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
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
        entity: 'payment',
        entityId: params.entityId,
        ...(params.userId && { userId: params.userId }),
        ...(params.changes && { changes: params.changes as Prisma.InputJsonValue }),
        ...(params.ip && { ip: params.ip }),
        ...(params.browser && { browser: params.browser }),
      },
    });
  }
}

export const paymentsRepository = new PaymentsRepository();

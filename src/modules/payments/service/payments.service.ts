import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@errors/index.js';
import { buildPaginationMeta, parsePagination } from '../../../utils/pagination.util.js';
import { PAYMENTS_CONSTANTS } from '../constants/payments.constants.js';
import {
  toPaymentDetailsDto,
  toPaymentSummaryDto,
  toRefundSummaryDto,
  toInvoiceSummaryDto,
  mapPaymentStatusFilter,
} from '../dto/payments.dto.js';
import { emitPaymentDomainEvent } from '../events/payments.events.js';
import { getPaymentGateway } from '../providers/payment-provider.registry.js';
import { paymentsRepository } from '../repository/payments.repository.js';
import {
  calculateCommission,
  decimalToNumber,
  generateInvoiceNumber,
  generatePaymentReference,
  resolvePlatformFeePercent,
} from '../utils/payments.util.js';
import { buildSettlementRecord } from '../utils/settlement.util.js';
import type { AuditMeta, PaymentOrderResponse } from '../types/payments.types.js';
import type {
  AdminPaymentListQuery,
  AdminRefundInput,
  CreatePaymentOrderInput,
  PaymentHistoryQuery,
  RefundRequestInput,
  VerifyPaymentInput,
} from '../schemas/payments.schema.js';

export class PaymentsService {
  private async writeAudit(
    action: string,
    entityId: string,
    userId?: string,
    changes?: Record<string, unknown>,
    audit?: AuditMeta,
  ): Promise<void> {
    await paymentsRepository.createAuditLog({
      action,
      entityId,
      ...(userId !== undefined && { userId }),
      ...(changes !== undefined && { changes }),
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
  }

  private async resolveCommission(amount: number) {
    const setting = await paymentsRepository.getPlatformFeePercent();
    const percent = resolvePlatformFeePercent(setting);
    return calculateCommission(amount, percent);
  }

  private async getLatestOrderId(paymentId: string): Promise<string | null> {
    const latest = await paymentsRepository.findLatestPaymentTransaction(paymentId, 'PAYMENT');
    return latest?.gatewayReference ?? null;
  }

  async createOrder(
    userId: string,
    input: CreatePaymentOrderInput,
    audit?: AuditMeta,
  ): Promise<PaymentOrderResponse> {
    const booking = await paymentsRepository.findBookingForPayment(input.bookingId, userId);
    if (!booking) throw new NotFoundError('Booking not found.');

    if (
      !PAYMENTS_CONSTANTS.PAYABLE_BOOKING_STATUSES.includes(
        booking.bookingStatus as (typeof PAYMENTS_CONSTANTS.PAYABLE_BOOKING_STATUSES)[number],
      )
    ) {
      throw new ValidationError('Booking is not awaiting payment.', {
        details: { code: PAYMENTS_CONSTANTS.ERROR_CODES.BOOKING_NOT_PAYABLE },
      });
    }

    const amount = decimalToNumber(booking.ticketPrice);
    if (amount <= 0) {
      throw new ValidationError('Free bookings do not require payment.');
    }

    const commission = await this.resolveCommission(amount);
    const gateway = getPaymentGateway(PAYMENTS_CONSTANTS.DEFAULT_GATEWAY);

    if (booking.payment) {
      const existing = booking.payment;
      if (existing.paymentStatus === 'CAPTURED') {
        throw new ConflictError('Payment already completed for this booking.');
      }

      if (existing.paymentStatus === 'PENDING') {
        const existingOrder = await this.getLatestOrderId(existing.id);
        if (existingOrder) {
          return {
            orderId: existingOrder,
            amount,
            currency: booking.currency,
            gateway: existing.gateway,
            paymentId: existing.id,
            paymentReference: existing.paymentReference,
          };
        }
      }

      if (
        PAYMENTS_CONSTANTS.RETRYABLE_PAYMENT_STATUSES.includes(
          existing.paymentStatus as (typeof PAYMENTS_CONSTANTS.RETRYABLE_PAYMENT_STATUSES)[number],
        )
      ) {
        const order = await gateway.createOrder({
          amount,
          currency: booking.currency,
          receipt: existing.paymentReference,
          notes: { bookingId: booking.id, paymentId: existing.id },
        });

        await paymentsRepository.updatePaymentOrder({
          paymentId: existing.id,
          orderId: order.orderId,
          amount: commission.grossAmount,
          platformFee: commission.platformFee,
          taxAmount: commission.taxAmount,
          discountAmount: commission.discountAmount,
          netAmount: commission.netAmount,
          orderPayload: order.raw ?? { orderId: order.orderId },
        });

        await this.writeAudit(
          PAYMENTS_CONSTANTS.AUDIT_ACTIONS.RETRIED,
          existing.id,
          userId,
          { orderId: order.orderId },
          audit,
        );

        emitPaymentDomainEvent('payment.order_created', {
          paymentId: existing.id,
          bookingId: booking.id,
          retry: true,
        });

        return {
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          gateway: order.gateway,
          paymentId: existing.id,
          paymentReference: existing.paymentReference,
        };
      }
    }

    const sequence = (await paymentsRepository.countPaymentsForReference()) + 1;
    const paymentReference = generatePaymentReference(sequence);

    const order = await gateway.createOrder({
      amount,
      currency: booking.currency,
      receipt: paymentReference,
      notes: { bookingId: booking.id },
    });

    const payment = await paymentsRepository.createPaymentWithOrder({
      bookingId: booking.id,
      userId,
      hostId: booking.event.hostId,
      paymentReference,
      amount: commission.grossAmount,
      platformFee: commission.platformFee,
      taxAmount: commission.taxAmount,
      discountAmount: commission.discountAmount,
      netAmount: commission.netAmount,
      currency: booking.currency,
      gateway: order.gateway,
      orderId: order.orderId,
      orderPayload: order.raw ?? { orderId: order.orderId },
    });

    await this.writeAudit(
      PAYMENTS_CONSTANTS.AUDIT_ACTIONS.ORDER_CREATED,
      payment.id,
      userId,
      { bookingId: booking.id, orderId: order.orderId, amount },
      audit,
    );

    emitPaymentDomainEvent('payment.order_created', {
      paymentId: payment.id,
      bookingId: booking.id,
    });

    return {
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      gateway: order.gateway,
      paymentId: payment.id,
      paymentReference,
    };
  }

  async verifyPayment(userId: string, input: VerifyPaymentInput, audit?: AuditMeta) {
    const txnRecord = await paymentsRepository.findPaymentByGatewayOrder(input.orderId);
    if (!txnRecord?.payment) {
      throw new NotFoundError('Payment order not found.');
    }

    const payment = txnRecord.payment;
    if (payment.userId !== userId) {
      throw new ForbiddenError('Payment does not belong to this user.');
    }

    if (payment.paymentStatus === 'CAPTURED') {
      return {
        payment: toPaymentDetailsDto(
          (await paymentsRepository.findPaymentForUser(payment.id, userId))!,
        ),
        alreadyVerified: true,
      };
    }

    const gateway = getPaymentGateway(payment.gateway);
    const verification = await gateway.verifyPayment({
      orderId: input.orderId,
      paymentId: input.paymentId,
      signature: input.signature,
    });

    if (!verification.verified) {
      await paymentsRepository.failPayment({
        paymentId: payment.id,
        bookingId: payment.bookingId,
        reason: 'Signature verification failed',
        gatewayOrderId: input.orderId,
        responsePayload: verification.raw ?? {},
      });

      await this.writeAudit(
        PAYMENTS_CONSTANTS.AUDIT_ACTIONS.FAILED,
        payment.id,
        userId,
        { reason: 'invalid_signature' },
        audit,
      );

      emitPaymentDomainEvent('payment.failed', { paymentId: payment.id });

      throw new ValidationError('Payment verification failed.', {
        details: { code: PAYMENTS_CONSTANTS.ERROR_CODES.PAYMENT_NOT_VERIFIED },
      });
    }

    const invoiceSeq = (await paymentsRepository.countInvoices()) + 1;
    const settlement = buildSettlementRecord(
      payment.id,
      payment.hostId,
      decimalToNumber(payment.netAmount),
      decimalToNumber(payment.platformFee),
    );

    const user = await paymentsRepository.findUserById(userId);

    const billingName = user?.profile
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : 'Cirvia User';
    const billingAddress = user?.profile?.city ?? 'India';

    const updated = await paymentsRepository.capturePayment({
      paymentId: payment.id,
      bookingId: payment.bookingId,
      gatewayPaymentId: input.paymentId,
      gatewayOrderId: input.orderId,
      ...(verification.method !== undefined && { paymentMethod: verification.method }),
      responsePayload: verification.raw ?? {},
      invoiceNumber: generateInvoiceNumber(invoiceSeq),
      billingName,
      billingAddress,
      settlementPayload: settlement as unknown as Record<string, unknown>,
    });

    if (!updated.newlyCaptured) {
      return {
        payment: toPaymentDetailsDto(updated.payment),
        alreadyVerified: true,
      };
    }

    try {
      const { getRedisClient } = await import('@redis/index.js');
      const { BOOKINGS_CONSTANTS } = await import(
        '../../bookings/constants/bookings.constants.js'
      );
      const { EVENTS_CONSTANTS } = await import(
        '../../events/constants/events.constants.js'
      );
      const { prisma } = await import('@database/index.js');
      const booking = await prisma.eventBooking.findFirst({
        where: { id: payment.bookingId },
        select: { eventId: true, event: { select: { slug: true } } },
      });
      if (booking?.eventId) {
        const redis = getRedisClient();
        const keys = [
          BOOKINGS_CONSTANTS.REDIS_KEYS.eventCapacity(booking.eventId),
          BOOKINGS_CONSTANTS.REDIS_KEYS.eventBookingCount(booking.eventId),
          EVENTS_CONSTANTS.REDIS_KEYS.featured,
          EVENTS_CONSTANTS.REDIS_KEYS.trending,
        ];
        if (booking.event?.slug) {
          keys.push(EVENTS_CONSTANTS.REDIS_KEYS.details(booking.event.slug));
        }
        await redis.del(...keys);
      }
    } catch {
      // Redis optional
    }

    await this.writeAudit(
      PAYMENTS_CONSTANTS.AUDIT_ACTIONS.VERIFIED,
      payment.id,
      userId,
      { gatewayPaymentId: input.paymentId },
      audit,
    );

    await this.writeAudit(
      PAYMENTS_CONSTANTS.AUDIT_ACTIONS.SETTLEMENT_SCHEDULED,
      payment.id,
      userId,
      settlement as unknown as Record<string, unknown>,
      audit,
    );

    await this.writeAudit(
      PAYMENTS_CONSTANTS.AUDIT_ACTIONS.INVOICE_GENERATED,
      payment.id,
      userId,
      { invoiceNumber: generateInvoiceNumber(invoiceSeq) },
      audit,
    );

    emitPaymentDomainEvent('payment.success', { paymentId: payment.id });
    emitPaymentDomainEvent('payment.completed', { paymentId: payment.id });
    emitPaymentDomainEvent('payment.settlement_scheduled', { paymentId: payment.id });

    try {
      const { walletService } = await import('../../wallet/service/wallet.service.js');
      await walletService.creditHostEarningsFromPayment(payment.id);
    } catch {
      // Wallet optional during partial deploy
    }

    return {
      payment: toPaymentDetailsDto(updated.payment),
      alreadyVerified: false,
    };
  }

  async getPaymentHistory(userId: string, query: PaymentHistoryQuery) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const statuses = mapPaymentStatusFilter(query.status);

    const { items, total } = await paymentsRepository.listUserPayments({
      userId,
      ...(statuses !== undefined && { statuses }),
      skip,
      take: limit,
    });

    return {
      payments: items.map((p) => toPaymentSummaryDto(p)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getPaymentDetails(userId: string, paymentId: string) {
    const payment = await paymentsRepository.findPaymentForUser(paymentId, userId);
    if (!payment) throw new NotFoundError('Payment not found.');
    return toPaymentDetailsDto(payment);
  }

  async getPaymentStatus(userId: string, paymentId: string) {
    const payment = await paymentsRepository.findPaymentForUser(paymentId, userId);
    if (!payment) throw new NotFoundError('Payment not found.');
    return {
      paymentId: payment.id,
      status: payment.paymentStatus,
      paidAt: payment.paidAt?.toISOString() ?? null,
      failureReason: payment.failureReason,
    };
  }

  async getInvoicePlaceholder(userId: string, paymentId: string) {
    const payment = await paymentsRepository.findPaymentForUser(paymentId, userId);
    if (!payment) throw new NotFoundError('Payment not found.');

    if (payment.paymentStatus !== 'CAPTURED' && payment.paymentStatus !== 'REFUNDED') {
      throw new ValidationError('Invoice available only for completed payments.');
    }

    if (!payment.invoice) {
      return {
        placeholder: true,
        message: 'Invoice PDF generation is not yet implemented.',
        paymentId: payment.id,
        paymentReference: payment.paymentReference,
      };
    }

    return {
      ...toInvoiceSummaryDto(payment.invoice),
      placeholder: true,
      message: 'Invoice PDF generation is not yet implemented. Metadata returned.',
    };
  }

  async requestRefund(userId: string, paymentId: string, input: RefundRequestInput, audit?: AuditMeta) {
    const payment = await paymentsRepository.findPaymentForUser(paymentId, userId);
    if (!payment) throw new NotFoundError('Payment not found.');

    if (
      !PAYMENTS_CONSTANTS.REFUNDABLE_PAYMENT_STATUSES.includes(
        payment.paymentStatus as (typeof PAYMENTS_CONSTANTS.REFUNDABLE_PAYMENT_STATUSES)[number],
      )
    ) {
      throw new ConflictError('Refund is not allowed for this payment.', {
        code: PAYMENTS_CONSTANTS.ERROR_CODES.REFUND_NOT_ALLOWED,
      });
    }

    const existing = await paymentsRepository.findLatestRefund(paymentId);
    if (existing && (existing.status === 'PENDING' || existing.status === 'APPROVED')) {
      throw new ConflictError('A refund request is already in progress.');
    }

    const refund = await paymentsRepository.createRefundRequest({
      paymentId,
      bookingId: payment.bookingId,
      requestedBy: userId,
      reason: input.reason,
      refundAmount: decimalToNumber(payment.amount),
    });

    await this.writeAudit(
      PAYMENTS_CONSTANTS.AUDIT_ACTIONS.REFUND_REQUESTED,
      paymentId,
      userId,
      { refundId: refund.id, reason: input.reason },
      audit,
    );

    emitPaymentDomainEvent('payment.refund_requested', { paymentId, refundId: refund.id });

    return toRefundSummaryDto(refund);
  }

  async getRefundStatus(userId: string, paymentId: string) {
    const payment = await paymentsRepository.findPaymentForUser(paymentId, userId);
    if (!payment) throw new NotFoundError('Payment not found.');

    const refund = await paymentsRepository.findLatestRefund(paymentId);
    if (!refund) {
      return { paymentId, refund: null };
    }

    return { paymentId, refund: toRefundSummaryDto(refund) };
  }

  async cancelPaymentForBooking(bookingId: string): Promise<void> {
    const payment = await paymentsRepository.findPaymentByBookingId(bookingId);
    if (!payment) return;

    if (payment.paymentStatus === 'CAPTURED' || payment.paymentStatus === 'REFUNDED') {
      return;
    }

    await paymentsRepository.cancelPayment(payment.id, bookingId);

    await this.writeAudit(PAYMENTS_CONSTANTS.AUDIT_ACTIONS.CANCELLED, payment.id, undefined, {
      bookingId,
    });

    emitPaymentDomainEvent('payment.cancelled', { paymentId: payment.id, bookingId });
  }

  async markPaymentFailed(paymentId: string, reason: string): Promise<void> {
    const payment = await paymentsRepository.findPaymentById(paymentId);
    if (!payment || payment.paymentStatus === 'CAPTURED') return;

    await paymentsRepository.failPayment({
      paymentId,
      bookingId: payment.bookingId,
      reason,
    });

    await this.writeAudit(PAYMENTS_CONSTANTS.AUDIT_ACTIONS.FAILED, paymentId, undefined, { reason });
    emitPaymentDomainEvent('payment.failed', { paymentId, reason });
  }

  async processWebhook(body: string, signature: string, audit?: AuditMeta) {
    const gateway = getPaymentGateway();
    if (!gateway.verifyWebhookSignature(body, signature)) {
      throw new ValidationError('Invalid webhook signature.', {
        details: { code: PAYMENTS_CONSTANTS.ERROR_CODES.INVALID_SIGNATURE },
      });
    }

    const payload = JSON.parse(body) as {
      event: string;
      payload?: { payment?: { entity?: Record<string, unknown> }; order?: { entity?: Record<string, unknown> } };
    };

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    await this.writeAudit(
      PAYMENTS_CONSTANTS.AUDIT_ACTIONS.WEBHOOK_RECEIVED,
      (paymentEntity?.id as string) ?? 'webhook',
      undefined,
      { event },
      audit,
    );

    if (event === 'payment.captured' && paymentEntity) {
      const orderId = paymentEntity.order_id as string;
      const paymentId = paymentEntity.id as string;
      const txn = await paymentsRepository.findPaymentByGatewayOrder(orderId);
      if (txn?.payment && txn.payment.paymentStatus !== 'CAPTURED') {
        const invoiceSeq = (await paymentsRepository.countInvoices()) + 1;
        const settlement = buildSettlementRecord(
          txn.payment.id,
          txn.payment.hostId,
          decimalToNumber(txn.payment.netAmount),
          decimalToNumber(txn.payment.platformFee),
        );

        const captureResult = await paymentsRepository.capturePayment({
          paymentId: txn.payment.id,
          bookingId: txn.payment.bookingId,
          gatewayPaymentId: paymentId,
          gatewayOrderId: orderId,
          paymentMethod: (paymentEntity.method as string) ?? 'razorpay',
          responsePayload: paymentEntity,
          invoiceNumber: generateInvoiceNumber(invoiceSeq),
          billingName: 'Cirvia User',
          billingAddress: 'India',
          settlementPayload: settlement as unknown as Record<string, unknown>,
        });

        if (captureResult.newlyCaptured) {
          emitPaymentDomainEvent('payment.success', { paymentId: txn.payment.id, source: 'webhook' });

          try {
            const { getRedisClient } = await import('@redis/index.js');
            const { BOOKINGS_CONSTANTS } = await import(
              '../../bookings/constants/bookings.constants.js'
            );
            const { EVENTS_CONSTANTS } = await import(
              '../../events/constants/events.constants.js'
            );
            const { prisma } = await import('@database/index.js');
            const booking = await prisma.eventBooking.findFirst({
              where: { id: txn.payment.bookingId },
              select: { eventId: true, event: { select: { slug: true } } },
            });
            if (booking?.eventId) {
              const redis = getRedisClient();
              const keys = [
                BOOKINGS_CONSTANTS.REDIS_KEYS.eventCapacity(booking.eventId),
                BOOKINGS_CONSTANTS.REDIS_KEYS.eventBookingCount(booking.eventId),
                EVENTS_CONSTANTS.REDIS_KEYS.featured,
                EVENTS_CONSTANTS.REDIS_KEYS.trending,
              ];
              if (booking.event?.slug) {
                keys.push(EVENTS_CONSTANTS.REDIS_KEYS.details(booking.event.slug));
              }
              await redis.del(...keys);
            }
          } catch {
            // Redis optional
          }

          try {
            const { walletService } = await import('../../wallet/service/wallet.service.js');
            await walletService.creditHostEarningsFromPayment(txn.payment.id);
          } catch {
            // Wallet optional during partial deploy
          }
        }
      }
    }

    if (event === 'payment.failed' && paymentEntity) {
      const orderId = paymentEntity.order_id as string;
      const txn = await paymentsRepository.findPaymentByGatewayOrder(orderId);
      if (txn?.payment) {
        await this.markPaymentFailed(
          txn.payment.id,
          (paymentEntity.error_description as string) ?? 'Payment failed',
        );
      }
    }

    void orderEntity;

    return { received: true, event };
  }

  async listAdminPayments(query: AdminPaymentListQuery) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const statuses = mapPaymentStatusFilter(query.status);

    const { items, total } = await paymentsRepository.listAdminPayments({
      ...(statuses !== undefined && { statuses }),
      ...(query.userId !== undefined && { userId: query.userId }),
      ...(query.hostId !== undefined && { hostId: query.hostId }),
      skip,
      take: limit,
    });

    return {
      payments: items.map((p) => toPaymentDetailsDto(p)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getAdminPaymentDetails(paymentId: string) {
    const payment = await paymentsRepository.findPaymentById(paymentId);
    if (!payment) throw new NotFoundError('Payment not found.');
    return toPaymentDetailsDto(payment);
  }

  async adminProcessRefund(
    adminUserId: string,
    paymentId: string,
    input: AdminRefundInput,
    audit?: AuditMeta,
  ) {
    const payment = await paymentsRepository.findPaymentById(paymentId);
    if (!payment) throw new NotFoundError('Payment not found.');

    if (!input.approve) {
      const refund = await paymentsRepository.findLatestRefund(paymentId);
      if (refund) {
        await paymentsRepository.failRefund(refund.id, 'REJECTED');
      }
      return { paymentId, status: 'REJECTED' };
    }

    if (
      !PAYMENTS_CONSTANTS.REFUNDABLE_PAYMENT_STATUSES.includes(
        payment.paymentStatus as (typeof PAYMENTS_CONSTANTS.REFUNDABLE_PAYMENT_STATUSES)[number],
      )
    ) {
      throw new ConflictError('Refund is not allowed for this payment.', {
        code: PAYMENTS_CONSTANTS.ERROR_CODES.REFUND_NOT_ALLOWED,
      });
    }

    let refund = await paymentsRepository.findLatestRefund(paymentId);
    if (!refund) {
      refund = await paymentsRepository.createRefundRequest({
        paymentId,
        bookingId: payment.bookingId,
        requestedBy: adminUserId,
        reason: input.reason ?? 'Admin initiated refund',
        refundAmount: decimalToNumber(payment.amount),
      });
    }

    if (!payment.gatewayTransactionId) {
      throw new ValidationError('Cannot refund — no gateway transaction recorded.');
    }

    const gateway = getPaymentGateway(payment.gateway);
    const gatewayRefund = await gateway.refundPayment({
      paymentId: payment.gatewayTransactionId,
      amount: decimalToNumber(payment.amount),
      currency: payment.currency,
      notes: { refundId: refund.id },
    });

    const processed = await paymentsRepository.processRefund({
      refundId: refund.id,
      paymentId,
      bookingId: payment.bookingId,
      approvedBy: adminUserId,
      gatewayReference: gatewayRefund.refundId,
      refundPayload: gatewayRefund.raw ?? {},
    });

    await this.writeAudit(
      PAYMENTS_CONSTANTS.AUDIT_ACTIONS.REFUND_PROCESSED,
      paymentId,
      adminUserId,
      { refundId: processed.id, gatewayRefundId: gatewayRefund.refundId },
      audit,
    );

    emitPaymentDomainEvent('payment.refund_completed', { paymentId, refundId: processed.id });

    try {
      const { walletService } = await import('../../wallet/service/wallet.service.js');
      await walletService.reverseHostEarningsFromPayment(paymentId);
    } catch {
      // Wallet optional during partial deploy
    }

    return toRefundSummaryDto(processed);
  }
}

export const paymentsService = new PaymentsService();

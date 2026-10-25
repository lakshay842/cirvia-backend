import type { Payment, PaymentTransaction, Refund, Invoice, EventBooking } from '@prisma/client';
import { decimalToNumber } from '../utils/payments.util.js';
import type { PaymentDetails, PaymentSummary, RefundSummary, InvoiceSummary } from '../types/payments.types.js';

type PaymentWithRelations = Payment & {
  booking: Pick<EventBooking, 'bookingReference'> & {
    event: { title: string };
  };
  refunds: Refund[];
  invoice: Invoice | null;
};

export function toPaymentSummaryDto(payment: Payment): PaymentSummary {
  return {
    id: payment.id,
    paymentReference: payment.paymentReference,
    bookingId: payment.bookingId,
    amount: decimalToNumber(payment.amount),
    currency: payment.currency,
    paymentStatus: payment.paymentStatus,
    gateway: payment.gateway,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

export function toRefundSummaryDto(refund: Refund): RefundSummary {
  return {
    id: refund.id,
    status: refund.status,
    refundAmount: decimalToNumber(refund.refundAmount),
    reason: refund.reason,
    requestedAt: refund.requestedAt.toISOString(),
    processedAt: refund.processedAt?.toISOString() ?? null,
  };
}

export function toInvoiceSummaryDto(invoice: Invoice): InvoiceSummary {
  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceUrl: invoice.invoiceUrl,
    generatedAt: invoice.generatedAt.toISOString(),
    placeholder: !invoice.invoiceUrl,
  };
}

export function toPaymentDetailsDto(payment: PaymentWithRelations): PaymentDetails {
  const latestRefund = payment.refunds[0];
  return {
    ...toPaymentSummaryDto(payment),
    platformFee: decimalToNumber(payment.platformFee),
    taxAmount: decimalToNumber(payment.taxAmount),
    discountAmount: decimalToNumber(payment.discountAmount),
    netAmount: decimalToNumber(payment.netAmount),
    paymentMethod: payment.paymentMethod,
    failureReason: payment.failureReason,
    gatewayTransactionId: payment.gatewayTransactionId,
    bookingReference: payment.booking.bookingReference,
    eventTitle: payment.booking.event.title,
    refund: latestRefund ? toRefundSummaryDto(latestRefund) : null,
    invoice: payment.invoice ? toInvoiceSummaryDto(payment.invoice) : null,
  };
}

export function mapPaymentStatusFilter(
  status: string,
): import('@prisma/client').PaymentStatus[] | undefined {
  if (status === 'all') return undefined;
  const map: Record<string, import('@prisma/client').PaymentStatus> = {
    pending: 'PENDING',
    authorized: 'AUTHORIZED',
    captured: 'CAPTURED',
    failed: 'FAILED',
    refunded: 'REFUNDED',
    partially_refunded: 'PARTIALLY_REFUNDED',
    cancelled: 'CANCELLED',
  };
  const mapped = map[status];
  return mapped ? [mapped] : undefined;
}

export type { PaymentTransaction };

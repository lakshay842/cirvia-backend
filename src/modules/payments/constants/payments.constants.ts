import { REDIS_CACHE_POLICY } from '@shared/cache/redis-cache-policy.js';

export const PAYMENTS_CONSTANTS = {
  DEFAULT_GATEWAY: 'razorpay',
  DEFAULT_CURRENCY: 'INR',
  QUEUE_NAME: 'payments',
  JOB_TYPES: {
    PROCESS_WEBHOOK: 'process_webhook',
    SCHEDULE_SETTLEMENT: 'schedule_settlement',
    RETRY_WEBHOOK: 'retry_webhook',
  },
  REDIS_KEYS: {
    paymentDetails: (paymentId: string) => `cache:payment:details:${paymentId}`,
    orderLock: (bookingId: string) => `cache:payment:order-lock:${bookingId}`,
  },
  REDIS_TTL: {
    details: REDIS_CACHE_POLICY.TTL.SHORT,
    orderLock: 60,
  },
  PLATFORM_FEE_SETTING_KEY: 'platform_fee_percent',
  DEFAULT_PLATFORM_FEE_PERCENT: 10,
  AUDIT_ACTIONS: {
    ORDER_CREATED: 'payment.order_created',
    VERIFIED: 'payment.verified',
    FAILED: 'payment.failed',
    CANCELLED: 'payment.cancelled',
    RETRIED: 'payment.retried',
    REFUND_REQUESTED: 'payment.refund_requested',
    REFUND_PROCESSED: 'payment.refund_processed',
    REFUND_FAILED: 'payment.refund_failed',
    WEBHOOK_RECEIVED: 'payment.webhook_received',
    SETTLEMENT_SCHEDULED: 'payment.settlement_scheduled',
    INVOICE_GENERATED: 'payment.invoice_generated',
  },
  ERROR_CODES: {
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    PAYMENT_NOT_VERIFIED: 'PAYMENT_NOT_VERIFIED',
    REFUND_NOT_ALLOWED: 'REFUND_NOT_ALLOWED',
    INVALID_SIGNATURE: 'INVALID_SIGNATURE',
    BOOKING_NOT_PAYABLE: 'BOOKING_NOT_PAYABLE',
  },
  PAYABLE_BOOKING_STATUSES: ['PENDING_PAYMENT'] as const,
  RETRYABLE_PAYMENT_STATUSES: ['FAILED', 'CANCELLED'] as const,
  REFUNDABLE_PAYMENT_STATUSES: ['CAPTURED', 'PARTIALLY_REFUNDED'] as const,
} as const;

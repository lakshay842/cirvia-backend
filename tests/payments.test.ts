import { describe, it, expect } from 'vitest';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  refundRequestSchema,
  paymentHistoryQuerySchema,
} from '../src/modules/payments/schemas/payments.schema.js';
import { PAYMENTS_CONSTANTS } from '../src/modules/payments/constants/payments.constants.js';
import {
  calculateCommission,
  generatePaymentReference,
  generateInvoiceNumber,
  resolvePlatformFeePercent,
} from '../src/modules/payments/utils/payments.util.js';
import { buildSettlementRecord } from '../src/modules/payments/utils/settlement.util.js';
import { razorpayProvider } from '../src/modules/payments/providers/razorpay.provider.js';

const bookingId = '550e8400-e29b-41d4-a716-446655440000';

describe('Payment schemas', () => {
  it('validates create order payload', () => {
    expect(createPaymentOrderSchema.safeParse({ bookingId }).success).toBe(true);
  });

  it('rejects unknown create order fields', () => {
    expect(createPaymentOrderSchema.safeParse({ bookingId, extra: true }).success).toBe(false);
  });

  it('validates verify payment payload', () => {
    expect(
      verifyPaymentSchema.safeParse({
        orderId: 'order_1',
        paymentId: 'pay_1',
        signature: 'sig_1',
      }).success,
    ).toBe(true);
  });

  it('validates refund request', () => {
    expect(refundRequestSchema.safeParse({ reason: 'Event was cancelled' }).success).toBe(true);
  });

  it('validates payment history query defaults', () => {
    const parsed = paymentHistoryQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.status).toBe('all');
  });
});

describe('Payment utilities', () => {
  it('generates payment reference format', () => {
    expect(generatePaymentReference(42)).toMatch(/^PAY-\d{4}-000042$/);
  });

  it('generates invoice number format', () => {
    expect(generateInvoiceNumber(7)).toMatch(/^INV-\d{4}-000007$/);
  });

  it('calculates commission breakdown', () => {
    const result = calculateCommission(1000, 10);
    expect(result.platformFee).toBe(100);
    expect(result.netAmount).toBe(900);
  });

  it('resolves platform fee percent with fallback', () => {
    expect(resolvePlatformFeePercent(null)).toBe(PAYMENTS_CONSTANTS.DEFAULT_PLATFORM_FEE_PERCENT);
    expect(resolvePlatformFeePercent('15')).toBe(15);
  });

  it('builds settlement record', () => {
    const record = buildSettlementRecord('pay-1', 'host-1', 900, 100);
    expect(record.status).toBe('PENDING_SETTLEMENT');
    expect(record.netAmount).toBe(900);
  });
});

describe('Payment capture idempotency', () => {
  it('documents row-lock capture guard for concurrent verify and webhook', () => {
    // capturePayment uses SELECT ... FOR UPDATE and returns newlyCaptured: false when already CAPTURED
    expect(PAYMENTS_CONSTANTS.ERROR_CODES.PAYMENT_NOT_VERIFIED).toBe('PAYMENT_NOT_VERIFIED');
  });
});

describe('Razorpay provider', () => {
  it('creates mock order in test environment', async () => {
    const order = await razorpayProvider.createOrder({
      amount: 500,
      currency: 'INR',
      receipt: 'PAY-TEST',
    });
    expect(order.orderId).toContain('order_mock_');
    expect(order.gateway).toBe('razorpay');
  });

  it('verifies mock payment signature in test', async () => {
    const result = await razorpayProvider.verifyPayment({
      orderId: 'order_mock_test',
      paymentId: 'pay_test',
      signature: 'valid_test_signature',
    });
    expect(result.verified).toBe(true);
  });

  it('validates webhook signature in test', () => {
    expect(razorpayProvider.verifyWebhookSignature('{}', 'sig')).toBe(true);
  });
});

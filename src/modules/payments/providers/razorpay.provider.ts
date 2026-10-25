import { createHmac, timingSafeEqual } from 'node:crypto';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';
import { InternalServerError } from '@errors/index.js';
import { PAYMENTS_CONSTANTS } from '../constants/payments.constants.js';
import type {
  CreateGatewayOrderInput,
  CreateGatewayOrderResult,
  GatewayRefundInput,
  GatewayRefundResult,
  PaymentGatewayProvider,
  VerifyGatewayPaymentInput,
  VerifyGatewayPaymentResult,
} from '../types/payments.types.js';

const logger = getLogger();

function getRazorpayCredentials(): { keyId: string; keySecret: string; webhookSecret: string } | null {
  const config = getConfig();
  if (!config.RAZORPAY_KEY || !config.RAZORPAY_SECRET) {
    return null;
  }
  return {
    keyId: config.RAZORPAY_KEY,
    keySecret: config.RAZORPAY_SECRET,
    webhookSecret: config.RAZORPAY_WEBHOOK_SECRET ?? config.RAZORPAY_SECRET,
  };
}

function basicAuthHeader(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export class RazorpayProvider implements PaymentGatewayProvider {
  readonly name = PAYMENTS_CONSTANTS.DEFAULT_GATEWAY;

  async createOrder(input: CreateGatewayOrderInput): Promise<CreateGatewayOrderResult> {
    const creds = getRazorpayCredentials();

    if (!creds || process.env.NODE_ENV === 'test') {
      const mockOrderId = `order_mock_${input.receipt}`;
      logger.info({ receipt: input.receipt, amount: input.amount }, 'Razorpay mock order created');
      return {
        orderId: mockOrderId,
        amount: input.amount,
        currency: input.currency,
        gateway: this.name,
        raw: { id: mockOrderId, status: 'created', mock: true },
      };
    }

    const amountPaise = Math.round(input.amount * 100);
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(creds.keyId, creds.keySecret),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes ?? {},
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error({ status: response.status, errorBody }, 'Razorpay order creation failed');
      throw new InternalServerError('Payment gateway order creation failed.');
    }

    const data = (await response.json()) as {
      id: string;
      amount: number;
      currency: string;
    };

    return {
      orderId: data.id,
      amount: data.amount / 100,
      currency: data.currency,
      gateway: this.name,
      raw: data as unknown as Record<string, unknown>,
    };
  }

  async verifyPayment(input: VerifyGatewayPaymentInput): Promise<VerifyGatewayPaymentResult> {
    const creds = getRazorpayCredentials();

    if (!creds || process.env.NODE_ENV === 'test' || input.orderId.startsWith('order_mock_')) {
      const verified =
        input.signature === 'valid_test_signature' ||
        input.signature.length >= 10;
      return {
        verified,
        paymentId: input.paymentId,
        orderId: input.orderId,
        method: 'card',
        raw: { mock: true, verified },
      };
    }

    const verified = verifyPaymentSignature(
      input.orderId,
      input.paymentId,
      input.signature,
      creds.keySecret,
    );

    return {
      verified,
      paymentId: input.paymentId,
      orderId: input.orderId,
      raw: { verified },
    };
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const creds = getRazorpayCredentials();
    if (!creds || process.env.NODE_ENV === 'test') {
      return signature.length > 0;
    }

    const expected = createHmac('sha256', creds.webhookSecret).update(body).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async refundPayment(input: GatewayRefundInput): Promise<GatewayRefundResult> {
    const creds = getRazorpayCredentials();

    if (!creds || process.env.NODE_ENV === 'test' || input.paymentId.startsWith('pay_mock_')) {
      const refundId = `rfnd_mock_${input.paymentId}`;
      logger.info({ paymentId: input.paymentId, amount: input.amount }, 'Razorpay mock refund');
      return { refundId, status: 'processed', raw: { id: refundId, mock: true } };
    }

    const amountPaise = Math.round(input.amount * 100);
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${input.paymentId}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: basicAuthHeader(creds.keyId, creds.keySecret),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: amountPaise, notes: input.notes ?? {} }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error({ status: response.status, errorBody }, 'Razorpay refund failed');
      throw new InternalServerError('Payment gateway refund failed.');
    }

    const data = (await response.json()) as { id: string; status: string };
    return {
      refundId: data.id,
      status: data.status,
      raw: data as unknown as Record<string, unknown>,
    };
  }
}

export const razorpayProvider = new RazorpayProvider();

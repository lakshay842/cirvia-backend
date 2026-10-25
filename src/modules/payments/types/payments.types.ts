import type { PaymentStatus, RefundStatus } from '@prisma/client';

export interface AuditMeta {
  ip?: string;
  browser?: string;
}

export interface CreateGatewayOrderInput {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateGatewayOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  gateway: string;
  raw?: Record<string, unknown>;
}

export interface VerifyGatewayPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface VerifyGatewayPaymentResult {
  verified: boolean;
  paymentId: string;
  orderId: string;
  method?: string;
  raw?: Record<string, unknown>;
}

export interface GatewayRefundInput {
  paymentId: string;
  amount: number;
  currency: string;
  notes?: Record<string, string>;
}

export interface GatewayRefundResult {
  refundId: string;
  status: string;
  raw?: Record<string, unknown>;
}

export interface PaymentGatewayProvider {
  readonly name: string;
  createOrder(input: CreateGatewayOrderInput): Promise<CreateGatewayOrderResult>;
  verifyPayment(input: VerifyGatewayPaymentInput): Promise<VerifyGatewayPaymentResult>;
  verifyWebhookSignature(body: string, signature: string): boolean;
  refundPayment(input: GatewayRefundInput): Promise<GatewayRefundResult>;
}

export interface CommissionBreakdown {
  grossAmount: number;
  platformFeePercent: number;
  platformFee: number;
  taxAmount: number;
  discountAmount: number;
  netAmount: number;
}

export interface SettlementRecord {
  paymentId: string;
  hostId: string;
  netAmount: number;
  platformFee: number;
  scheduledAt: string;
  status: 'PENDING_SETTLEMENT';
}

export interface PaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  gateway: string;
  paymentId?: string;
  paymentReference?: string;
}

export interface PaymentSummary {
  id: string;
  paymentReference: string;
  bookingId: string;
  amount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  gateway: string;
  paidAt: string | null;
  createdAt: string;
}

export interface PaymentDetails extends PaymentSummary {
  platformFee: number;
  taxAmount: number;
  discountAmount: number;
  netAmount: number;
  paymentMethod: string | null;
  failureReason: string | null;
  gatewayTransactionId: string | null;
  bookingReference: string;
  eventTitle: string;
  refund: RefundSummary | null;
  invoice: InvoiceSummary | null;
}

export interface RefundSummary {
  id: string;
  status: RefundStatus;
  refundAmount: number;
  reason: string;
  requestedAt: string;
  processedAt: string | null;
}

export interface InvoiceSummary {
  invoiceNumber: string;
  invoiceUrl: string | null;
  generatedAt: string;
  placeholder: boolean;
}

export interface WebhookProcessPayload {
  event: string;
  payload: Record<string, unknown>;
  signature: string;
}

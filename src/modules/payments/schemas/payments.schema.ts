import { z } from 'zod';

const uuid = z.string().uuid();

export const createPaymentOrderSchema = z
  .object({
    bookingId: uuid,
  })
  .strict();

export const verifyPaymentSchema = z
  .object({
    orderId: z.string().min(1),
    paymentId: z.string().min(1),
    signature: z.string().min(1),
  })
  .strict();

export const paymentIdParamSchema = z.object({
  paymentId: uuid,
});

export const refundRequestSchema = z
  .object({
    reason: z.string().min(5).max(500),
  })
  .strict();

export const adminRefundSchema = z
  .object({
    reason: z.string().min(5).max(500).optional(),
    approve: z.boolean().default(true),
  })
  .strict();

export const paymentHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z
      .enum([
        'pending',
        'authorized',
        'captured',
        'failed',
        'refunded',
        'partially_refunded',
        'cancelled',
        'all',
      ])
      .default('all'),
  })
  .strict();

export const adminPaymentListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z
      .enum([
        'pending',
        'authorized',
        'captured',
        'failed',
        'refunded',
        'partially_refunded',
        'cancelled',
        'all',
      ])
      .default('all'),
    userId: uuid.optional(),
    hostId: uuid.optional(),
  })
  .strict();

export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
export type AdminRefundInput = z.infer<typeof adminRefundSchema>;
export type PaymentHistoryQuery = z.infer<typeof paymentHistoryQuerySchema>;
export type AdminPaymentListQuery = z.infer<typeof adminPaymentListQuerySchema>;

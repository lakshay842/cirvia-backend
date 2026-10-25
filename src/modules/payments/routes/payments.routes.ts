import { Router } from 'express';
import express from 'express';
import { authenticate } from '@middleware/auth.middleware.js';
import { requirePermission } from '@middleware/authorize.middleware.js';
import { paymentRateLimiter } from '@middleware/rate-limit.middleware.js';
import { validateRequest } from '@middleware/validate.middleware.js';
import { paymentsController } from '../controller/payments.controller.js';
import {
  adminPaymentListQuerySchema,
  adminRefundSchema,
  createPaymentOrderSchema,
  paymentHistoryQuerySchema,
  paymentIdParamSchema,
  refundRequestSchema,
  verifyPaymentSchema,
} from '../schemas/payments.schema.js';

export const paymentsWebhookRouter = Router();

paymentsWebhookRouter.post(
  '/razorpay',
  express.raw({ type: 'application/json' }),
  paymentsController.webhook,
);

export const paymentsRouter = Router();

paymentsRouter.use(authenticate);

paymentsRouter.post(
  '/order',
  paymentRateLimiter(),
  validateRequest({ body: createPaymentOrderSchema }),
  paymentsController.createOrder,
);

paymentsRouter.post(
  '/verify',
  paymentRateLimiter(),
  validateRequest({ body: verifyPaymentSchema }),
  paymentsController.verify,
);

paymentsRouter.get(
  '/',
  validateRequest({ query: paymentHistoryQuerySchema }),
  paymentsController.listHistory,
);

paymentsRouter.get(
  '/:paymentId/refund-status',
  validateRequest({ params: paymentIdParamSchema }),
  paymentsController.getRefundStatus,
);

paymentsRouter.get(
  '/:paymentId/invoice',
  validateRequest({ params: paymentIdParamSchema }),
  paymentsController.getInvoice,
);

paymentsRouter.post(
  '/:paymentId/refund',
  paymentRateLimiter(),
  validateRequest({ params: paymentIdParamSchema, body: refundRequestSchema }),
  paymentsController.requestRefund,
);

paymentsRouter.get(
  '/:paymentId/status',
  validateRequest({ params: paymentIdParamSchema }),
  paymentsController.getStatus,
);

paymentsRouter.get(
  '/:paymentId',
  validateRequest({ params: paymentIdParamSchema }),
  paymentsController.getDetails,
);

export const adminPaymentsRouter = Router();

adminPaymentsRouter.use(authenticate, requirePermission('payments.read'));

adminPaymentsRouter.get(
  '/',
  validateRequest({ query: adminPaymentListQuerySchema }),
  paymentsController.listAdmin,
);

adminPaymentsRouter.get(
  '/:paymentId',
  validateRequest({ params: paymentIdParamSchema }),
  paymentsController.getAdminDetails,
);

adminPaymentsRouter.post(
  '/:paymentId/refund',
  requirePermission('payments.refund'),
  paymentRateLimiter(),
  validateRequest({ params: paymentIdParamSchema, body: adminRefundSchema }),
  paymentsController.adminRefund,
);

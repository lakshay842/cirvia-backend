import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@common/index.js';
import { HTTP_STATUS } from '@constants/index.js';
import { paymentsService } from '../service/payments.service.js';
import type {
  AdminPaymentListQuery,
  AdminRefundInput,
  CreatePaymentOrderInput,
  PaymentHistoryQuery,
  RefundRequestInput,
  VerifyPaymentInput,
} from '../schemas/payments.schema.js';

function auditMeta(req: Request): { ip?: string; browser?: string } {
  const meta: { ip?: string; browser?: string } = {};
  if (req.ip) meta.ip = req.ip;
  const browser = req.headers['user-agent'];
  if (browser) meta.browser = browser;
  return meta;
}

export class PaymentsController {
  createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await paymentsService.createOrder(
        req.user!.id,
        req.body as CreatePaymentOrderInput,
        auditMeta(req),
      );
      sendSuccess(res, {
        message: 'Payment order created.',
        data: result,
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  verify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await paymentsService.verifyPayment(
        req.user!.id,
        req.body as VerifyPaymentInput,
        auditMeta(req),
      );
      sendSuccess(res, {
        message: result.alreadyVerified ? 'Payment already verified.' : 'Payment verified successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  listHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await paymentsService.getPaymentHistory(
        req.user!.id,
        req.query as unknown as PaymentHistoryQuery,
      );
      sendSuccess(res, { message: 'Payment history retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  getDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paymentId } = req.params as { paymentId: string };
      const payment = await paymentsService.getPaymentDetails(req.user!.id, paymentId);
      sendSuccess(res, { message: 'Payment details retrieved.', data: { payment } });
    } catch (error) {
      next(error);
    }
  };

  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paymentId } = req.params as { paymentId: string };
      const status = await paymentsService.getPaymentStatus(req.user!.id, paymentId);
      sendSuccess(res, { message: 'Payment status retrieved.', data: status });
    } catch (error) {
      next(error);
    }
  };

  getInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paymentId } = req.params as { paymentId: string };
      const invoice = await paymentsService.getInvoicePlaceholder(req.user!.id, paymentId);
      sendSuccess(res, { message: 'Invoice placeholder retrieved.', data: invoice });
    } catch (error) {
      next(error);
    }
  };

  requestRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paymentId } = req.params as { paymentId: string };
      const refund = await paymentsService.requestRefund(
        req.user!.id,
        paymentId,
        req.body as RefundRequestInput,
        auditMeta(req),
      );
      sendSuccess(res, {
        message: 'Refund request submitted.',
        data: { refund },
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  getRefundStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paymentId } = req.params as { paymentId: string };
      const result = await paymentsService.getRefundStatus(req.user!.id, paymentId);
      sendSuccess(res, { message: 'Refund status retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  webhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const signature = req.headers['x-razorpay-signature'];
      if (typeof signature !== 'string') {
        res.status(400).json({ success: false, message: 'Missing webhook signature.' });
        return;
      }

      const rawBody =
        typeof req.body === 'string'
          ? req.body
          : Buffer.isBuffer(req.body)
            ? req.body.toString('utf8')
            : JSON.stringify(req.body);

      const result = await paymentsService.processWebhook(rawBody, signature, auditMeta(req));
      sendSuccess(res, { message: 'Webhook processed.', data: result });
    } catch (error) {
      next(error);
    }
  };

  listAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await paymentsService.listAdminPayments(
        req.query as unknown as AdminPaymentListQuery,
      );
      sendSuccess(res, { message: 'Payments retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  getAdminDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paymentId } = req.params as { paymentId: string };
      const payment = await paymentsService.getAdminPaymentDetails(paymentId);
      sendSuccess(res, { message: 'Payment details retrieved.', data: { payment } });
    } catch (error) {
      next(error);
    }
  };

  adminRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paymentId } = req.params as { paymentId: string };
      const refund = await paymentsService.adminProcessRefund(
        req.user!.id,
        paymentId,
        req.body as AdminRefundInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Refund processed.', data: { refund } });
    } catch (error) {
      next(error);
    }
  };
}

export const paymentsController = new PaymentsController();

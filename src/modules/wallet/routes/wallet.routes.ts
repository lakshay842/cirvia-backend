import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware.js';
import { requireHost, requirePermission } from '@middleware/authorize.middleware.js';
import { validateRequest } from '@middleware/validate.middleware.js';
import { walletController } from '../controller/wallet.controller.js';
import {
  addBankAccountSchema,
  adminBankAccountListQuerySchema,
  adminPayoutListQuerySchema,
  bankAccountIdParamSchema,
  payoutIdParamSchema,
  rejectPayoutSchema,
  updateBankAccountSchema,
  walletTransactionsQuerySchema,
  withdrawalRequestSchema,
} from '../schemas/wallet.schema.js';

export const walletRouter = Router();

walletRouter.use(authenticate, requireHost);

walletRouter.get('/', walletController.getSummary);

walletRouter.get(
  '/transactions',
  validateRequest({ query: walletTransactionsQuerySchema }),
  walletController.getTransactions,
);

walletRouter.get(
  '/withdrawals',
  validateRequest({ query: walletTransactionsQuerySchema }),
  walletController.getWithdrawals,
);

walletRouter.post(
  '/withdraw',
  validateRequest({ body: withdrawalRequestSchema }),
  walletController.requestWithdrawal,
);

walletRouter.get('/bank-accounts', walletController.listBankAccounts);

walletRouter.post(
  '/bank-accounts',
  validateRequest({ body: addBankAccountSchema }),
  walletController.addBankAccount,
);

walletRouter.patch(
  '/bank-accounts/:id',
  validateRequest({ params: bankAccountIdParamSchema, body: updateBankAccountSchema }),
  walletController.updateBankAccount,
);

walletRouter.delete(
  '/bank-accounts/:id',
  validateRequest({ params: bankAccountIdParamSchema }),
  walletController.deleteBankAccount,
);

export const adminPayoutsRouter = Router();

adminPayoutsRouter.use(authenticate, requirePermission('payments.read'));

adminPayoutsRouter.get('/overview', walletController.getAdminWalletOverview);

adminPayoutsRouter.get(
  '/',
  validateRequest({ query: adminPayoutListQuerySchema }),
  walletController.listAdminPayouts,
);

adminPayoutsRouter.get(
  '/bank-accounts',
  validateRequest({ query: adminBankAccountListQuerySchema }),
  walletController.listAdminBankAccounts,
);

adminPayoutsRouter.get(
  '/bank-accounts/:id',
  validateRequest({ params: bankAccountIdParamSchema }),
  walletController.getAdminBankAccount,
);

adminPayoutsRouter.patch(
  '/bank-accounts/:id/verify',
  requirePermission('payments.refund'),
  validateRequest({ params: bankAccountIdParamSchema }),
  walletController.verifyBankAccount,
);

adminPayoutsRouter.patch(
  '/bank-accounts/:id/reject',
  requirePermission('payments.refund'),
  validateRequest({ params: bankAccountIdParamSchema, body: rejectPayoutSchema }),
  walletController.rejectBankAccount,
);

adminPayoutsRouter.patch(
  '/:payoutId/approve',
  requirePermission('payments.refund'),
  validateRequest({ params: payoutIdParamSchema }),
  walletController.approvePayout,
);

adminPayoutsRouter.patch(
  '/:payoutId/reject',
  requirePermission('payments.refund'),
  validateRequest({ params: payoutIdParamSchema, body: rejectPayoutSchema }),
  walletController.rejectPayout,
);

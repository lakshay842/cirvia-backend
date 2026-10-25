import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@common/index.js';
import { HTTP_STATUS } from '@constants/index.js';
import { walletService } from '../service/wallet.service.js';
import type {
  AddBankAccountInput,
  AdminBankAccountListQuery,
  AdminPayoutListQuery,
  RejectPayoutInput,
  UpdateBankAccountInput,
  WalletTransactionsQuery,
  WithdrawalRequestInput,
} from '../schemas/wallet.schema.js';

function auditMeta(req: Request): { ip?: string; browser?: string } {
  const meta: { ip?: string; browser?: string } = {};
  if (req.ip) meta.ip = req.ip;
  const browser = req.headers['user-agent'];
  if (browser) meta.browser = browser;
  return meta;
}

export class WalletController {
  getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await walletService.getSummary(req.user!.id);
      sendSuccess(res, { message: 'Wallet summary retrieved.', data: summary });
    } catch (error) {
      next(error);
    }
  };

  getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await walletService.getTransactions(
        req.user!.id,
        req.query as unknown as WalletTransactionsQuery,
      );
      sendSuccess(res, { message: 'Wallet transactions retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  getWithdrawals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await walletService.getWithdrawalHistory(
        req.user!.id,
        req.query as unknown as WalletTransactionsQuery,
      );
      sendSuccess(res, { message: 'Withdrawal history retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  requestWithdrawal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const withdrawal = await walletService.requestWithdrawal(
        req.user!.id,
        req.body as WithdrawalRequestInput,
        auditMeta(req),
      );
      sendSuccess(res, {
        message: 'Withdrawal requested.',
        data: { withdrawal },
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  listBankAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accounts = await walletService.listBankAccounts(req.user!.id);
      sendSuccess(res, { message: 'Bank accounts retrieved.', data: { accounts } });
    } catch (error) {
      next(error);
    }
  };

  addBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const account = await walletService.addBankAccount(
        req.user!.id,
        req.body as AddBankAccountInput,
        auditMeta(req),
      );
      sendSuccess(res, {
        message: 'Bank account added.',
        data: { account },
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  updateBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const account = await walletService.updateBankAccount(
        req.user!.id,
        id,
        req.body as UpdateBankAccountInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Bank account updated.', data: { account } });
    } catch (error) {
      next(error);
    }
  };

  deleteBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      await walletService.deleteBankAccount(req.user!.id, id, auditMeta(req));
      sendSuccess(res, { message: 'Bank account deleted.', data: {} });
    } catch (error) {
      next(error);
    }
  };

  getAdminWalletOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const overview = await walletService.getAdminWalletOverview();
      sendSuccess(res, { message: 'Admin wallet overview retrieved.', data: { overview } });
    } catch (error) {
      next(error);
    }
  };

  listAdminPayouts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await walletService.listAdminPayouts(
        req.query as unknown as AdminPayoutListQuery,
      );
      sendSuccess(res, { message: 'Payouts retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  approvePayout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { payoutId } = req.params as { payoutId: string };
      const payout = await walletService.approvePayout(req.user!.id, payoutId, auditMeta(req));
      sendSuccess(res, { message: 'Payout approved.', data: { payout } });
    } catch (error) {
      next(error);
    }
  };

  rejectPayout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { payoutId } = req.params as { payoutId: string };
      const payout = await walletService.rejectPayout(
        req.user!.id,
        payoutId,
        req.body as RejectPayoutInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Payout rejected.', data: { payout } });
    } catch (error) {
      next(error);
    }
  };

  listAdminBankAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await walletService.listAdminBankAccounts(
        req.query as unknown as AdminBankAccountListQuery,
      );
      sendSuccess(res, { message: 'Bank accounts retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  getAdminBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const account = await walletService.getAdminBankAccount(id);
      sendSuccess(res, { message: 'Bank account details retrieved.', data: { account } });
    } catch (error) {
      next(error);
    }
  };

  verifyBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const account = await walletService.verifyBankAccount(req.user!.id, id, auditMeta(req));
      sendSuccess(res, { message: 'Bank account verified.', data: { account } });
    } catch (error) {
      next(error);
    }
  };

  rejectBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const account = await walletService.rejectBankAccount(
        req.user!.id,
        id,
        req.body as RejectPayoutInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Bank account rejected.', data: { account } });
    } catch (error) {
      next(error);
    }
  };
}

export const walletController = new WalletController();

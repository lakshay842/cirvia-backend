import { z } from 'zod';

const uuid = z.string().uuid();

export const walletTransactionsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    type: z
      .enum(['credit', 'debit', 'refund', 'commission', 'withdrawal', 'adjustment', 'all'])
      .default('all'),
  })
  .strict();

export const withdrawalRequestSchema = z
  .object({
    amount: z.coerce.number().positive(),
    bankAccountId: uuid,
  })
  .strict();

export const bankAccountIdParamSchema = z.object({
  id: uuid,
});

export const addBankAccountSchema = z
  .object({
    accountHolderName: z
      .string()
      .min(2, 'Account holder name must be at least 2 characters')
      .max(100, 'Account holder name must be at most 100 characters'),
    bankName: z
      .string()
      .min(2, 'Bank name must be at least 2 characters')
      .max(100, 'Bank name must be at most 100 characters'),
    accountNumber: z
      .string()
      .min(8, 'Account number must be at least 8 digits')
      .max(20, 'Account number must be at most 20 digits')
      .regex(/^[0-9]+$/, 'Account number must contain digits only'),
    ifscCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z]{4}0[A-Z0-9]{6}$/,
        'IFSC must be 11 characters like HDFC0001234 (4 letters, 0, then 6 letters/digits)',
      ),
    upiId: z.string().max(50, 'UPI ID must be at most 50 characters').optional(),
    isPrimary: z.boolean().default(false),
  })
  .strict();

export const updateBankAccountSchema = z
  .object({
    accountHolderName: z.string().min(2).max(100).optional(),
    bankName: z.string().min(2).max(100).optional(),
    upiId: z.string().max(50).nullable().optional(),
    isPrimary: z.boolean().optional(),
  })
  .strict();

export const adminPayoutListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled', 'all']).default('all'),
  })
  .strict();

export const payoutIdParamSchema = z.object({
  payoutId: uuid,
});

export const rejectPayoutSchema = z
  .object({
    reason: z.string().min(5).max(500).optional(),
  })
  .strict();

export const adminBankAccountListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending'),
  })
  .strict();

export type WalletTransactionsQuery = z.infer<typeof walletTransactionsQuerySchema>;
export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;
export type AddBankAccountInput = z.infer<typeof addBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
export type AdminPayoutListQuery = z.infer<typeof adminPayoutListQuerySchema>;
export type RejectPayoutInput = z.infer<typeof rejectPayoutSchema>;
export type AdminBankAccountListQuery = z.infer<typeof adminBankAccountListQuerySchema>;

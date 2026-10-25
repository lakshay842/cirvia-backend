import { z } from 'zod';

const verificationTypeSchema = z.enum([
  'AADHAAR',
  'PASSPORT',
  'DRIVING_LICENSE',
  'VOTER_ID',
  'PAN_CARD',
  'INTERNATIONAL_ID',
]);

export const submitVerificationSchema = z
  .object({
    verificationType: verificationTypeSchema,
    documentNumber: z.string().trim().min(4).max(50).optional(),
    expiryDate: z.string().date().optional(),
  })
  .strict();

export const verificationIdParamSchema = z.object({ verificationId: z.string().uuid() }).strict();

export const resubmitVerificationSchema = z
  .object({
    verificationType: verificationTypeSchema.optional(),
    documentNumber: z.string().trim().min(4).max(50).optional(),
    expiryDate: z.string().date().optional(),
  })
  .strict();

export const rejectVerificationSchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export const requestReuploadSchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
    requiredDocuments: z
      .array(z.enum(['front', 'back', 'selfie']))
      .min(1)
      .optional(),
  })
  .strict();

export const internalNoteSchema = z
  .object({
    note: z.string().trim().min(1).max(2000),
  })
  .strict();

export const adminVerificationListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z
      .enum([
        'PENDING',
        'UNDER_REVIEW',
        'APPROVED',
        'REJECTED',
        'BLOCKED',
        'EXPIRED',
        'RESUBMITTED',
        'CANCELLED',
      ])
      .optional(),
  })
  .strict();

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;
export type ResubmitVerificationInput = z.infer<typeof resubmitVerificationSchema>;
export type RejectVerificationInput = z.infer<typeof rejectVerificationSchema>;
export type RequestReuploadInput = z.infer<typeof requestReuploadSchema>;
export type InternalNoteInput = z.infer<typeof internalNoteSchema>;
export type AdminVerificationListQuery = z.infer<typeof adminVerificationListQuerySchema>;

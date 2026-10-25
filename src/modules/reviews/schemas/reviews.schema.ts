import { z } from 'zod';

const rating = z.number().int().min(1).max(5);
const mediaUrls = z.array(z.string().url()).max(5).optional();

export const submitEventReviewSchema = z
  .object({
    bookingId: z.string().uuid(),
    rating,
    title: z.string().min(1).max(120).optional(),
    comment: z.string().min(1).max(2000).optional(),
    wouldRecommend: z.boolean().optional().default(true),
    mediaUrls,
  })
  .strict();

export const submitHostReviewSchema = z
  .object({
    bookingId: z.string().uuid(),
    rating,
    title: z.string().min(1).max(120).optional(),
    comment: z.string().min(1).max(2000).optional(),
    wouldRecommend: z.boolean().optional().default(true),
    mediaUrls,
  })
  .strict();

export const submitGuestReviewSchema = z
  .object({
    bookingId: z.string().uuid(),
    rating,
    comment: z.string().min(1).max(2000).optional(),
    mediaUrls,
  })
  .strict();

export const updateReviewSchema = z
  .object({
    type: z.enum(['event', 'host', 'guest']),
    rating: rating.optional(),
    title: z.string().min(1).max(120).optional(),
    comment: z.string().min(1).max(2000).optional(),
    wouldRecommend: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 1, { message: 'At least one field besides type is required.' });

export const reviewIdParamSchema = z.object({ reviewId: z.string().uuid() }).strict();

export const reviewTypeQuerySchema = z
  .object({
    type: z.enum(['event', 'host', 'guest']),
  })
  .strict();

export const reviewListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    sort: z.enum(['latest', 'oldest', 'highest', 'lowest', 'helpful']).optional().default('latest'),
  })
  .strict();

export const reviewReplySchema = z
  .object({
    type: z.enum(['event', 'host', 'guest']),
    comment: z.string().min(1).max(2000),
  })
  .strict();

export const reportReviewSchema = z
  .object({
    type: z.enum(['event', 'host', 'guest']),
    reason: z.string().min(3).max(200),
    description: z.string().max(2000).optional(),
  })
  .strict();

export const reportReviewContractSchema = reportReviewSchema
  .extend({
    reviewId: z.string().uuid(),
  })
  .strict();

export const moderateReviewSchema = z
  .object({
    type: z.enum(['event', 'host', 'guest']),
    action: z.enum(['approve', 'reject', 'hide']),
    reason: z.string().max(500).optional(),
  })
  .strict();

export const adminReviewListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.enum(['pending', 'approved', 'rejected', 'hidden', 'all']).optional().default('pending'),
    type: z.enum(['event', 'host', 'guest', 'all']).optional().default('all'),
  })
  .strict();

export const eventIdReviewsParamSchema = z.object({ eventId: z.string().uuid() }).strict();
export const hostIdReviewsParamSchema = z.object({ hostId: z.string().uuid() }).strict();

export type SubmitEventReviewInput = z.infer<typeof submitEventReviewSchema>;
export type SubmitHostReviewInput = z.infer<typeof submitHostReviewSchema>;
export type SubmitGuestReviewInput = z.infer<typeof submitGuestReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;
export type ReviewReplyInput = z.infer<typeof reviewReplySchema>;
export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
export type ReportReviewContractInput = z.infer<typeof reportReviewContractSchema>;
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
export type AdminReviewListQuery = z.infer<typeof adminReviewListQuerySchema>;

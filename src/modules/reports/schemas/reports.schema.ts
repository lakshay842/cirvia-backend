import { z } from 'zod';

const uuid = z.string().uuid();
const categorySchema = z.enum([
  'Spam',
  'Harassment',
  'Violence',
  'Fake Profile',
  'Scam',
  'NSFW',
  'Other',
]);

const baseReportBody = z
  .object({
    reason: categorySchema,
    description: z.string().max(2000).optional(),
  })
  .strict();

export const reportUserSchema = baseReportBody
  .extend({
    userId: uuid,
  })
  .strict();

export const reportHostSchema = baseReportBody
  .extend({
    hostId: uuid,
  })
  .strict();

export const reportEventSchema = baseReportBody
  .extend({
    eventId: uuid,
  })
  .strict();

export const reportBookingSchema = baseReportBody
  .extend({
    bookingId: uuid,
  })
  .strict();

export const reportReviewSchema = baseReportBody
  .extend({
    reviewId: uuid,
    type: z.enum(['event', 'host', 'guest']),
  })
  .strict();

export const reportIdParamSchema = z.object({ reportId: uuid }).strict();

export const myReportsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['pending', 'under_review', 'resolved', 'rejected', 'closed', 'all']).default('all'),
    type: z.enum(['user', 'host', 'event', 'review', 'booking', 'all']).default('all'),
  })
  .strict();

export const adminReportsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['pending', 'under_review', 'resolved', 'rejected', 'closed', 'all']).default('all'),
    category: z
      .enum(['Spam', 'Harassment', 'Violence', 'Fake Profile', 'Scam', 'NSFW', 'Other', 'all'])
      .default('all'),
    priority: z.enum(['low', 'medium', 'high', 'urgent', 'all']).default('all'),
    type: z.enum(['user', 'host', 'event', 'review', 'booking', 'all']).default('all'),
    assignedTo: uuid.optional(),
  })
  .strict();

export const assignModeratorSchema = z
  .object({
    moderatorId: uuid,
    note: z.string().max(1000).optional(),
  })
  .strict();

export const investigationNoteSchema = z
  .object({
    note: z.string().min(1).max(2000),
    isInternal: z.boolean().default(true),
  })
  .strict();

export const resolveReportSchema = z
  .object({
    resolution: z.string().min(1).max(2000),
    action: z.enum(['warning', 'suspend', 'ban', 'dismiss', 'escalate']).optional(),
  })
  .strict();

export const dismissReportSchema = z
  .object({
    reason: z.string().min(1).max(2000),
  })
  .strict();

export const closeReportSchema = z
  .object({
    reason: z.string().min(1).max(2000).optional(),
  })
  .strict();

export const rejectReportSchema = dismissReportSchema;

export type ReportUserInput = z.infer<typeof reportUserSchema>;
export type ReportHostInput = z.infer<typeof reportHostSchema>;
export type ReportEventInput = z.infer<typeof reportEventSchema>;
export type ReportBookingInput = z.infer<typeof reportBookingSchema>;
export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
export type MyReportsQuery = z.infer<typeof myReportsQuerySchema>;
export type AdminReportsQuery = z.infer<typeof adminReportsQuerySchema>;
export type AssignModeratorInput = z.infer<typeof assignModeratorSchema>;
export type InvestigationNoteInput = z.infer<typeof investigationNoteSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type DismissReportInput = z.infer<typeof dismissReportSchema>;

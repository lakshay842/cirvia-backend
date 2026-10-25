import { z } from 'zod';

const notificationTypeFilter = z.enum([
  'all',
  'booking',
  'payment',
  'refund',
  'verification',
  'reminder',
  'promotion',
  'security',
  'support',
  'review',
  'trust_score',
]);

export const notificationListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    type: notificationTypeFilter.optional().default('all'),
    unreadOnly: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
  })
  .strict();

export const notificationIdParamSchema = z
  .object({
    notificationId: z.string().uuid(),
  })
  .strict();

export const updateNotificationPreferencesSchema = z
  .object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
    marketing: z.boolean().optional(),
    security: z.boolean().optional(),
    booking: z.boolean().optional(),
    review: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required.',
  });

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;

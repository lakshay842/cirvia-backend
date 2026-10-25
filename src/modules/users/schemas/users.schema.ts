import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(50).optional(),
    lastName: z.string().trim().min(1).max(50).optional(),
    bio: z.string().trim().max(500).optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    dob: z.string().date().optional(),
    occupation: z.string().trim().max(100).optional(),
    company: z.string().trim().max(100).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    instagram: z.string().trim().url().max(255).optional().or(z.literal('')),
    linkedin: z.string().trim().url().max(255).optional().or(z.literal('')),
    twitter: z.string().trim().url().max(255).optional().or(z.literal('')),
    github: z.string().trim().url().max(255).optional().or(z.literal('')),
    website: z.string().trim().url().max(255).optional().or(z.literal('')),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required.',
  });

export const updateInterestsSchema = z
  .object({
    interests: z.array(z.string().trim().min(1).max(50)).min(1).max(20),
  })
  .strict();

export const followUserBodySchema = z
  .object({
    userId: uuidSchema,
  })
  .strict();

export const userIdParamSchema = z.object({ userId: uuidSchema }).strict();
export const usernameParamSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/),
  })
  .strict();

export const unfollowIdParamSchema = z.object({ id: uuidSchema }).strict();
export const deviceIdParamSchema = z.object({ deviceId: z.string().min(1) }).strict();
export const providerParamSchema = z
  .object({
    provider: z.enum(['GOOGLE', 'APPLE', 'EMAIL', 'PHONE']),
  })
  .strict();

export const updatePrivacySettingsSchema = z
  .object({
    profileVisibility: z.enum(['PUBLIC', 'FOLLOWERS', 'PRIVATE']).optional(),
    activityVisibility: z.enum(['PUBLIC', 'FOLLOWERS', 'PRIVATE']).optional(),
    showEmail: z.boolean().optional(),
    showPhone: z.boolean().optional(),
    showLastSeen: z.boolean().optional(),
    allowFollowRequests: z.boolean().optional(),
    showTrustScore: z.boolean().optional(),
    showActivityFeed: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required.',
  });

export const updateAccountSettingsSchema = z
  .object({
    language: z.string().trim().min(2).max(10).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    dateFormat: z.string().trim().min(1).max(20).optional(),
    currency: z.string().trim().length(3).optional(),
    twoFactorEnabled: z.boolean().optional(),
    marketingOptIn: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required.',
  });

export const updateNotificationSettingsSchema = z
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

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateInterestsInput = z.infer<typeof updateInterestsSchema>;
export type FollowUserBodyInput = z.infer<typeof followUserBodySchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type UpdatePrivacySettingsInput = z.infer<typeof updatePrivacySettingsSchema>;
export type UpdateAccountSettingsInput = z.infer<typeof updateAccountSettingsSchema>;
export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;

export const adminUserListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']).optional(),
    city: z.string().trim().max(100).optional(),
    verified: z
      .union([z.literal('true'), z.literal('false'), z.boolean()])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === true || v === 'true')),
    role: z.string().trim().max(50).optional(),
  })
  .strict();

export const adminUpdateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(50).optional(),
    lastName: z.string().trim().min(1).max(50).optional(),
    city: z.string().trim().max(100).optional(),
    accountStatus: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required.',
  });

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

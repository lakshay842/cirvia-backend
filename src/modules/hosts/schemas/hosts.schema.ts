import { z } from 'zod';

const addressSchema = z
  .object({
    addressLine1: z.string().trim().min(1).max(200),
    addressLine2: z.string().trim().max(200).optional(),
    landmark: z.string().trim().max(100).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    country: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(20),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
  })
  .strict();

const emergencyContactSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phone: z.string().trim().min(8).max(20),
  })
  .strict();

export const becomeHostSchema = z
  .object({
    bio: z.string().trim().min(10).max(1000),
    experience: z.string().trim().min(1).max(500),
    languages: z.array(z.string().trim().min(1).max(50)).min(1).max(10),
    interests: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    address: addressSchema,
    emergencyContact: emergencyContactSchema,
    displayName: z.string().trim().min(2).max(100).optional(),
  })
  .strict();

export const updateHostProfileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(100).optional(),
    bio: z.string().trim().min(10).max(1000).optional(),
    about: z.string().trim().max(2000).optional(),
    occupation: z.string().trim().max(100).optional(),
    experience: z.string().trim().max(500).optional(),
    languages: z.array(z.string().trim().min(1).max(50)).min(1).max(10).optional(),
    interests: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    responseTime: z.coerce.number().int().positive().max(1440).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required.' });

export const updateHostAddressSchema = addressSchema;

export const updateEmergencyContactSchema = emergencyContactSchema;

export const updateHostPreferencesSchema = z
  .object({
    notifyBookings: z.boolean().optional(),
    notifyReviews: z.boolean().optional(),
    autoApproveBookings: z.boolean().optional(),
    publicProfile: z.boolean().optional(),
    showEmail: z.boolean().optional(),
    showPhone: z.boolean().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required.' });

export const updateAvailabilitySchema = z
  .object({
    availability: z
      .array(
        z
          .object({
            day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
            startTime: z.string().regex(/^\d{2}:\d{2}$/),
            endTime: z.string().regex(/^\d{2}:\d{2}$/),
          })
          .strict(),
      )
      .max(14),
  })
  .strict();

export const updateSocialLinksSchema = z
  .object({
    instagram: z.string().trim().url().max(255).optional().or(z.literal('')),
    linkedin: z.string().trim().url().max(255).optional().or(z.literal('')),
    twitter: z.string().trim().url().max(255).optional().or(z.literal('')),
    website: z.string().trim().url().max(255).optional().or(z.literal('')),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required.' });

export const slugParamSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(80)
      .regex(/^[a-z0-9-]+$/),
  })
  .strict();

export const hostIdParamSchema = z.object({ hostId: z.string().uuid() }).strict();
export const mediaIdParamSchema = z
  .object({ mediaId: z.string().uuid() })
  .strict();

export const adminHostListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'INACTIVE', 'DELETED']).optional(),
  })
  .strict();

export const rejectHostSchema = z
  .object({ reason: z.string().trim().min(3).max(500) })
  .strict();

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

export type BecomeHostInput = z.infer<typeof becomeHostSchema>;
export type UpdateHostProfileInput = z.infer<typeof updateHostProfileSchema>;
export type UpdateHostAddressInput = z.infer<typeof updateHostAddressSchema>;
export type UpdateEmergencyContactInput = z.infer<typeof updateEmergencyContactSchema>;
export type UpdateHostPreferencesInput = z.infer<typeof updateHostPreferencesSchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type UpdateSocialLinksInput = z.infer<typeof updateSocialLinksSchema>;
export type AdminHostListQuery = z.infer<typeof adminHostListQuerySchema>;
export type RejectHostInput = z.infer<typeof rejectHostSchema>;

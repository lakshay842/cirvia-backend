import { z } from 'zod';

const locationSchema = z
  .object({
    venueName: z.string().trim().min(1).max(200),
    addressLine1: z.string().trim().min(1).max(200),
    addressLine2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    country: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(20),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    googlePlaceId: z.string().trim().max(255).optional(),
    mapUrl: z.string().trim().url().max(500).optional(),
    isPrivateAddress: z.boolean().optional(),
  })
  .strict();

const ruleSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export const createEventSchema = z
  .object({
    title: z.string().trim().min(5).max(200),
    description: z.string().trim().min(50).max(10000),
    shortDescription: z.string().trim().max(300).optional(),
    categoryId: z.string().uuid(),
    capacity: z.coerce.number().int().positive().max(10000),
    price: z.coerce.number().min(0).max(1000000),
    currency: z.string().trim().length(3).optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'INVITE_ONLY', 'APPROVAL_REQUIRED']),
    approvalRequired: z.boolean().optional(),
    minimumAge: z.coerce.number().int().min(18).max(99).optional(),
    maximumAge: z.coerce.number().int().min(18).max(120).optional(),
    language: z.string().trim().min(1).max(50).optional(),
    timezone: z.string().trim().max(64).optional(),
    eventDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    bookingStart: z.string().datetime({ offset: true }).optional(),
    bookingEnd: z.string().datetime({ offset: true }).optional(),
    dressCode: z.string().trim().max(100).optional(),
    foodProvided: z.boolean().optional(),
    parkingAvailable: z.boolean().optional(),
    petsAllowed: z.boolean().optional(),
    smokingAllowed: z.boolean().optional(),
    amenities: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
    location: locationSchema,
    rules: z.array(ruleSchema).max(20).optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(15).optional(),
  })
  .strict()
  .refine(
    (d) => !d.maximumAge || !d.minimumAge || d.maximumAge >= d.minimumAge,
    { message: 'maximumAge must be >= minimumAge', path: ['maximumAge'] },
  );

export const updateEventSchema = z
  .object({
    title: z.string().trim().min(5).max(200).optional(),
    description: z.string().trim().min(50).max(10000).optional(),
    shortDescription: z.string().trim().max(300).optional(),
    categoryId: z.string().uuid().optional(),
    capacity: z.coerce.number().int().positive().max(10000).optional(),
    price: z.coerce.number().min(0).max(1000000).optional(),
    currency: z.string().trim().length(3).optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'INVITE_ONLY', 'APPROVAL_REQUIRED']).optional(),
    approvalRequired: z.boolean().optional(),
    minimumAge: z.coerce.number().int().min(18).max(99).optional(),
    maximumAge: z.coerce.number().int().min(18).max(120).optional(),
    language: z.string().trim().min(1).max(50).optional(),
    timezone: z.string().trim().max(64).optional(),
    eventDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    bookingStart: z.string().datetime({ offset: true }).optional(),
    bookingEnd: z.string().datetime({ offset: true }).optional(),
    dressCode: z.string().trim().max(100).optional(),
    foodProvided: z.boolean().optional(),
    parkingAvailable: z.boolean().optional(),
    petsAllowed: z.boolean().optional(),
    smokingAllowed: z.boolean().optional(),
    amenities: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
    rules: z.array(ruleSchema).max(20).optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(15).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required.' });

export const updateEventLocationSchema = locationSchema;

export const cancelEventSchema = z
  .object({ reason: z.string().trim().min(3).max(500) })
  .strict();

export const rejectEventSchema = z
  .object({ reason: z.string().trim().min(3).max(500) })
  .strict();

export const eventIdParamSchema = z.object({ eventId: z.string().uuid() }).strict();
export const slugParamSchema = z
  .object({ slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9-]+$/) })
  .strict();
export const mediaIdParamSchema = z.object({ mediaId: z.string().uuid() }).strict();
export const ruleIdParamSchema = z
  .object({ eventId: z.string().uuid(), ruleId: z.string().uuid() })
  .strict();
export const tagIdParamSchema = z
  .object({ eventId: z.string().uuid(), tagId: z.string().uuid() })
  .strict();

export const addRuleSchema = ruleSchema;
export const updateRuleSchema = ruleSchema.partial().refine((d) => Object.keys(d).length > 0, {
  message: 'At least one field is required.',
});

export const addTagsSchema = z
  .object({ tags: z.array(z.string().trim().min(1).max(50)).min(1).max(15) })
  .strict();

export const reorderMediaSchema = z
  .object({
    media: z
      .array(
        z.object({ id: z.string().uuid(), order: z.coerce.number().int().min(0) }).strict(),
      )
      .min(1),
  })
  .strict();

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

export const hostEventsQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum([
      'draft',
      'pending_review',
      'published',
      'booking_open',
      'booking_closed',
      'cancelled',
      'completed',
      'archived',
    ])
    .optional(),
});

export const publicEventsQuerySchema = paginationQuerySchema.extend({
  city: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  priceType: z.enum(['free', 'paid']).optional(),
  date: z.string().optional(),
  radius: z.coerce.number().positive().max(500).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  verifiedHost: z.coerce.boolean().optional(),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(['newest', 'nearest', 'trending', 'rating', 'price_asc', 'price_desc']).optional(),
});

export const nearbyEventsQuerySchema = paginationQuerySchema.extend({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(500).default(25),
});

export const searchEventsQuerySchema = paginationQuerySchema.extend({
  keyword: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  date: z.string().optional(),
});

export const categorySlugParamSchema = z
  .object({ slug: z.string().trim().min(1).max(100) })
  .strict();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type UpdateEventLocationInput = z.infer<typeof updateEventLocationSchema>;
export type CancelEventInput = z.infer<typeof cancelEventSchema>;
export type RejectEventInput = z.infer<typeof rejectEventSchema>;
export type HostEventsQuery = z.infer<typeof hostEventsQuerySchema>;
export type PublicEventsQuery = z.infer<typeof publicEventsQuerySchema>;
export type NearbyEventsQuery = z.infer<typeof nearbyEventsQuerySchema>;
export type SearchEventsQuery = z.infer<typeof searchEventsQuerySchema>;
export type ReorderMediaInput = z.infer<typeof reorderMediaSchema>;
export type AddRuleInput = z.infer<typeof addRuleSchema>;
export type AddTagsInput = z.infer<typeof addTagsSchema>;

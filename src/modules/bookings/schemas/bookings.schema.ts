import { z } from 'zod';

const uuid = z.string().uuid();

export const createBookingSchema = z
  .object({
    eventId: uuid,
    ticketQuantity: z.number().int().min(1).max(20),
    couponCode: z.string().trim().min(1).max(50).optional(),
  })
  .strict();

export const cancelBookingSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const rejectBookingSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const joinWaitlistSchema = z
  .object({
    eventId: uuid,
  })
  .strict();

export const bookingIdParamSchema = z.object({
  bookingId: uuid,
});

export const waitlistIdParamSchema = z.object({
  waitlistId: uuid,
});

export const eventIdParamSchema = z.object({
  eventId: uuid,
});

export const myBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['upcoming', 'past', 'cancelled', 'pending', 'confirmed', 'all'])
    .optional()
    .default('all'),
});

export const hostBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['pending', 'confirmed', 'cancelled', 'rejected', 'all'])
    .optional()
    .default('all'),
  eventId: uuid.optional(),
});

export const adminBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      'pending',
      'confirmed',
      'cancelled',
      'rejected',
      'completed',
      'refunded',
      'all',
    ])
    .optional()
    .default('all'),
  search: z.string().trim().max(100).optional(),
  eventId: uuid.optional(),
});

export const guestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;
export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
export type MyBookingsQuery = z.infer<typeof myBookingsQuerySchema>;
export type HostBookingsQuery = z.infer<typeof hostBookingsQuerySchema>;
export type AdminBookingsQuery = z.infer<typeof adminBookingsQuerySchema>;
export type GuestListQuery = z.infer<typeof guestListQuerySchema>;

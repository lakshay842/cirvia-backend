import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware.js';
import { requirePermission } from '@middleware/authorize.middleware.js';
import { bookingRateLimiter } from '@middleware/rate-limit.middleware.js';
import { validateRequest } from '@middleware/validate.middleware.js';
import { bookingsController } from '../controller/bookings.controller.js';
import {
  adminBookingsQuerySchema,
  bookingIdParamSchema,
  cancelBookingSchema,
  createBookingSchema,
  joinWaitlistSchema,
  myBookingsQuerySchema,
  waitlistIdParamSchema,
} from '../schemas/bookings.schema.js';

export const bookingsRouter = Router();

bookingsRouter.use(authenticate);

bookingsRouter.post(
  '/',
  bookingRateLimiter(),
  validateRequest({ body: createBookingSchema }),
  bookingsController.create,
);

bookingsRouter.get(
  '/',
  validateRequest({ query: myBookingsQuerySchema }),
  bookingsController.listMine,
);

bookingsRouter.get(
  '/history',
  validateRequest({ query: myBookingsQuerySchema }),
  bookingsController.getHistory,
);

bookingsRouter.post(
  '/waitlist',
  validateRequest({ body: joinWaitlistSchema }),
  bookingsController.joinWaitlist,
);

bookingsRouter.delete(
  '/waitlist/:waitlistId',
  validateRequest({ params: waitlistIdParamSchema }),
  bookingsController.leaveWaitlist,
);

bookingsRouter.get(
  '/:bookingId/timeline',
  validateRequest({ params: bookingIdParamSchema }),
  bookingsController.getTimeline,
);

bookingsRouter.get(
  '/:bookingId/status',
  validateRequest({ params: bookingIdParamSchema }),
  bookingsController.getStatus,
);

bookingsRouter.get(
  '/:bookingId/qr',
  validateRequest({ params: bookingIdParamSchema }),
  bookingsController.getQr,
);

bookingsRouter.patch(
  '/:bookingId/cancel',
  validateRequest({ params: bookingIdParamSchema, body: cancelBookingSchema }),
  bookingsController.cancel,
);

bookingsRouter.post(
  '/:bookingId/cancellation-request',
  validateRequest({ params: bookingIdParamSchema }),
  bookingsController.requestCancellation,
);

bookingsRouter.get(
  '/:bookingId',
  validateRequest({ params: bookingIdParamSchema }),
  bookingsController.getDetails,
);

export const adminBookingsRouter = Router();

adminBookingsRouter.use(authenticate, requirePermission('events.moderate'));

adminBookingsRouter.get(
  '/',
  validateRequest({ query: adminBookingsQuerySchema }),
  bookingsController.listAdminBookings,
);

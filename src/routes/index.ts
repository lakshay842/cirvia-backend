import { Router } from 'express';
import { adminRateLimiter } from '@middleware/rate-limit.middleware.js';
import { authRouter } from '../modules/auth/routes/auth.routes.js';
import {
  usersRouter,
  trustScoreRouter,
  activityRouter,
  adminUsersRouter,
} from '../modules/users/routes/users.routes.js';
import {
  verificationRouter,
  adminVerificationRouter,
} from '../modules/verification/routes/verification.routes.js';
import { hostsRouter, adminHostsRouter } from '../modules/hosts/routes/hosts.routes.js';
import {
  eventsRouter,
  categoriesRouter,
  adminEventsRouter,
} from '../modules/events/routes/events.routes.js';
import {
  adminPaymentsRouter,
  paymentsRouter,
  paymentsWebhookRouter,
} from '../modules/payments/routes/payments.routes.js';
import { walletRouter, adminPayoutsRouter } from '../modules/wallet/routes/wallet.routes.js';
import { notificationsRouter } from '../modules/notifications/routes/notifications.routes.js';
import {
  reviewsRouter,
  adminReviewsRouter,
} from '../modules/reviews/routes/reviews.routes.js';
import { reportsRouter, adminReportsRouter } from '../modules/reports/routes/reports.routes.js';
import {
  adminAnalyticsRouter,
  adminDashboardRouter,
  adminExportRouter,
} from '../modules/analytics/routes/analytics.routes.js';
import { bookingsRouter, adminBookingsRouter } from '../modules/bookings/routes/bookings.routes.js';

/**
 * API v1 router — feature modules register here.
 */
export function createApiRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Cirvia API v1',
      data: {
        version: '1.1.0',
      },
      meta: {},
    });
  });

  router.use('/auth', authRouter);
  router.use('/users', usersRouter);
  router.use('/trust-score', trustScoreRouter);
  router.use('/activity', activityRouter);
  router.use('/notifications', notificationsRouter);
  router.use('/reviews', reviewsRouter);
  router.use('/reports', reportsRouter);
  router.use('/admin/dashboard', adminRateLimiter(), adminDashboardRouter);
  router.use('/admin/reports', adminRateLimiter(), adminReportsRouter);
  router.use('/admin/analytics', adminRateLimiter(), adminAnalyticsRouter);
  router.use('/admin/export', adminRateLimiter(), adminExportRouter);
  router.use('/admin/reviews', adminRateLimiter(), adminReviewsRouter);
  router.use('/verification', verificationRouter);
  router.use('/admin/verifications', adminRateLimiter(), adminVerificationRouter);
  router.use('/hosts', hostsRouter);
  router.use('/admin/hosts', adminRateLimiter(), adminHostsRouter);
  router.use('/events', eventsRouter);
  router.use('/categories', categoriesRouter);
  router.use('/admin/events', adminRateLimiter(), adminEventsRouter);
  router.use('/admin/users', adminRateLimiter(), adminUsersRouter);
  router.use('/bookings', bookingsRouter);
  router.use('/admin/bookings', adminRateLimiter(), adminBookingsRouter);
  router.use('/payments', paymentsRouter);
  router.use('/admin/payments', adminRateLimiter(), adminPaymentsRouter);
  router.use('/wallet', walletRouter);
  router.use('/admin/payouts', adminRateLimiter(), adminPayoutsRouter);

  return router;
}

export { paymentsWebhookRouter };

export { healthRouter } from './health.routes.js';

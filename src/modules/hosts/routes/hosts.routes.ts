import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '@middleware/auth.middleware.js';
import { requireHost, requirePermission } from '@middleware/authorize.middleware.js';
import { validateRequest } from '@middleware/validate.middleware.js';
import { hostsController } from '../controller/hosts.controller.js';
import {
  hostAvatarUpload,
  hostCoverUpload,
  hostGalleryUpload,
  hostDocumentsUpload,
} from '../middleware/hosts-upload.middleware.js';
import {
  becomeHostSchema,
  updateHostProfileSchema,
  updateHostAddressSchema,
  updateEmergencyContactSchema,
  updateHostPreferencesSchema,
  updateAvailabilitySchema,
  updateSocialLinksSchema,
  slugParamSchema,
  hostIdParamSchema,
  mediaIdParamSchema,
  adminHostListQuerySchema,
  rejectHostSchema,
  paginationQuerySchema,
} from '../schemas/hosts.schema.js';
import { eventsController } from '../../events/controller/events.controller.js';
import {
  hostEventsQuerySchema,
  eventIdParamSchema,
} from '../../events/schemas/events.schema.js';
import { bookingsController } from '../../bookings/controller/bookings.controller.js';
import {
  bookingIdParamSchema,
  hostBookingsQuerySchema,
  rejectBookingSchema,
} from '../../bookings/schemas/bookings.schema.js';
import { hostReviewsPublicRouter } from '../../reviews/routes/reviews.routes.js';
import { hostIdReviewsParamSchema } from '../../reviews/schemas/reviews.schema.js';

const router = Router();

router.post(
  '/apply',
  authenticate,
  validateRequest({ body: becomeHostSchema }),
  hostsController.apply,
);

const meRouter = Router();
meRouter.use(requireHost);

meRouter.get('/', hostsController.getMe);
meRouter.patch('/', validateRequest({ body: updateHostProfileSchema }), hostsController.updateMe);
meRouter.get('/statistics', hostsController.getStatistics);
meRouter.get('/analytics', hostsController.getAnalytics);
meRouter.get('/badges', hostsController.getBadges);
meRouter.get('/preferences', hostsController.getPreferences);
meRouter.patch(
  '/preferences',
  validateRequest({ body: updateHostPreferencesSchema }),
  hostsController.updatePreferences,
);
meRouter.get('/address', hostsController.getAddress);
meRouter.patch(
  '/address',
  validateRequest({ body: updateHostAddressSchema }),
  hostsController.updateAddress,
);
meRouter.get('/emergency-contact', hostsController.getEmergencyContact);
meRouter.patch(
  '/emergency-contact',
  validateRequest({ body: updateEmergencyContactSchema }),
  hostsController.updateEmergencyContact,
);
meRouter.get('/social-links', hostsController.getSocialLinks);
meRouter.patch(
  '/social-links',
  validateRequest({ body: updateSocialLinksSchema }),
  hostsController.updateSocialLinks,
);
meRouter.get('/availability', hostsController.getAvailability);
meRouter.patch(
  '/availability',
  validateRequest({ body: updateAvailabilitySchema }),
  hostsController.updateAvailability,
);
meRouter.post('/avatar', hostAvatarUpload, hostsController.uploadAvatar);
meRouter.post('/cover', hostCoverUpload, hostsController.uploadCover);
meRouter.post('/gallery', hostGalleryUpload, hostsController.uploadGallery);
meRouter.delete(
  '/gallery/:mediaId',
  validateRequest({ params: mediaIdParamSchema }),
  hostsController.deleteGalleryItem,
);
meRouter.get('/timeline', hostsController.getTimeline);
meRouter.get(
  '/activity',
  validateRequest({ query: paginationQuerySchema }),
  hostsController.getActivity,
);
meRouter.get('/profile-completion', hostsController.getProfileCompletion);
meRouter.post('/deactivate', hostsController.deactivate);
meRouter.post('/reactivate', hostsController.reactivate);

router.use('/me', authenticate, meRouter);

router.post('/documents', authenticate, requireHost, hostDocumentsUpload, hostsController.uploadDocuments);
router.get('/documents', authenticate, requireHost, hostsController.listDocuments);
router.get('/verification-status', authenticate, requireHost, hostsController.getVerificationStatus);
router.get('/dashboard', authenticate, requireHost, hostsController.getDashboard);

router.get(
  '/events',
  authenticate,
  requireHost,
  validateRequest({ query: hostEventsQuerySchema }),
  eventsController.listHostEvents,
);
router.get(
  '/events/:eventId/analytics',
  authenticate,
  requireHost,
  validateRequest({ params: eventIdParamSchema }),
  eventsController.getAnalytics,
);

router.get(
  '/bookings',
  authenticate,
  requireHost,
  validateRequest({ query: hostBookingsQuerySchema }),
  bookingsController.listHostBookings,
);
router.patch(
  '/bookings/:bookingId/approve',
  authenticate,
  requireHost,
  validateRequest({ params: bookingIdParamSchema }),
  bookingsController.approve,
);
router.patch(
  '/bookings/:bookingId/reject',
  authenticate,
  requireHost,
  validateRequest({ params: bookingIdParamSchema, body: rejectBookingSchema }),
  bookingsController.reject,
);

router.use(
  '/:hostId/reviews',
  (req, _res, next) => {
    const result = hostIdReviewsParamSchema.safeParse({ hostId: req.params.hostId });
    if (!result.success) {
      next('route');
      return;
    }
    next();
  },
  hostReviewsPublicRouter,
);

// Public profile — optional auth for owner preview, must be last
router.get(
  '/:slug',
  optionalAuthenticate,
  validateRequest({ params: slugParamSchema }),
  hostsController.getPublicProfile,
);

export const hostsRouter = router;

export const adminHostsRouter = Router();

adminHostsRouter.use(authenticate, requirePermission('hosts.verify'));

adminHostsRouter.get(
  '/',
  validateRequest({ query: adminHostListQuerySchema }),
  hostsController.listAdminHosts,
);
adminHostsRouter.get(
  '/:hostId',
  validateRequest({ params: hostIdParamSchema }),
  hostsController.getAdminHostDetails,
);
adminHostsRouter.patch(
  '/:hostId/approve',
  validateRequest({ params: hostIdParamSchema }),
  hostsController.approveHost,
);
adminHostsRouter.patch(
  '/:hostId/reject',
  validateRequest({ params: hostIdParamSchema, body: rejectHostSchema }),
  hostsController.rejectHost,
);
adminHostsRouter.patch(
  '/:hostId/suspend',
  validateRequest({ params: hostIdParamSchema }),
  hostsController.suspendHost,
);

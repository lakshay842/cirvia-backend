import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '@middleware/auth.middleware.js';
import { requireHost, requirePermission } from '@middleware/authorize.middleware.js';
import { searchRateLimiter } from '@middleware/rate-limit.middleware.js';
import { validateRequest } from '@middleware/validate.middleware.js';
import { eventsController } from '../controller/events.controller.js';
import {
  eventMediaUpload,
} from '../middleware/events-upload.middleware.js';
import { bookingsController } from '../../bookings/controller/bookings.controller.js';
import { guestListQuerySchema } from '../../bookings/schemas/bookings.schema.js';
import {
  eventReviewsPublicRouter,
} from '../../reviews/routes/reviews.routes.js';
import { eventIdReviewsParamSchema } from '../../reviews/schemas/reviews.schema.js';
import {
  createEventSchema,
  updateEventSchema,
  cancelEventSchema,
  rejectEventSchema,
  eventIdParamSchema,
  slugParamSchema,
  mediaIdParamSchema,
  ruleIdParamSchema,
  tagIdParamSchema,
  updateEventLocationSchema,
  reorderMediaSchema,
  addRuleSchema,
  addTagsSchema,
  publicEventsQuerySchema,
  nearbyEventsQuerySchema,
  searchEventsQuerySchema,
  paginationQuerySchema,
  categorySlugParamSchema,
} from '../schemas/events.schema.js';

function uuidEventIdOnly(req: Request, res: Response, next: NextFunction): void {
  const segment = req.params.eventId;
  const result = eventIdParamSchema.safeParse({ eventId: segment });
  if (!result.success) {
    if (req.method === 'GET') {
      const slugResult = slugParamSchema.safeParse({ slug: segment });
      if (!slugResult.success) {
        next('route');
        return;
      }
      req.params.slug = slugResult.data.slug;
      void optionalAuthenticate(req, res, (err) => {
        if (err) {
          next(err);
          return;
        }
        void eventsController.getBySlug(req, res, next);
      });
      return;
    }
    next('route');
    return;
  }
  next();
}

export const eventsRouter = Router();

// Public discovery — static paths first
eventsRouter.get(
  '/featured',
  validateRequest({ query: paginationQuerySchema }),
  eventsController.listFeatured,
);
eventsRouter.get(
  '/trending',
  validateRequest({ query: paginationQuerySchema }),
  eventsController.listTrending,
);
eventsRouter.get(
  '/nearby',
  validateRequest({ query: nearbyEventsQuerySchema }),
  eventsController.listNearby,
);
eventsRouter.get(
  '/search',
  searchRateLimiter(),
  validateRequest({ query: searchEventsQuerySchema }),
  eventsController.search,
);
eventsRouter.get(
  '/upcoming',
  validateRequest({ query: publicEventsQuerySchema }),
  eventsController.listUpcoming,
);
eventsRouter.get(
  '/past',
  validateRequest({ query: publicEventsQuerySchema }),
  eventsController.listPast,
);
eventsRouter.get(
  '/',
  validateRequest({ query: publicEventsQuerySchema }),
  eventsController.listPublic,
);

// Host-authenticated event management
eventsRouter.post(
  '/',
  authenticate,
  requireHost,
  validateRequest({ body: createEventSchema }),
  eventsController.create,
);

const hostEventRouter = Router({ mergeParams: true });
hostEventRouter.use(authenticate, requireHost);

hostEventRouter.get('/', eventsController.getById);
hostEventRouter.patch('/', validateRequest({ body: updateEventSchema }), eventsController.update);
hostEventRouter.delete('/', eventsController.delete);
hostEventRouter.patch('/publish', eventsController.publish);
hostEventRouter.patch('/unpublish', eventsController.unpublish);
hostEventRouter.patch('/cancel', validateRequest({ body: cancelEventSchema }), eventsController.cancel);
hostEventRouter.patch('/archive', eventsController.archive);
hostEventRouter.post('/duplicate', eventsController.duplicate);
hostEventRouter.get('/guests', validateRequest({ query: guestListQuerySchema }), bookingsController.getGuestList);
hostEventRouter.get('/attendance', bookingsController.getAttendance);
hostEventRouter.get('/location', eventsController.getLocation);
hostEventRouter.patch(
  '/location',
  validateRequest({ body: updateEventLocationSchema }),
  eventsController.updateLocation,
);
hostEventRouter.post('/rules', validateRequest({ body: addRuleSchema }), eventsController.addRule);
hostEventRouter.delete(
  '/rules/:ruleId',
  validateRequest({ params: ruleIdParamSchema }),
  eventsController.deleteRule,
);
hostEventRouter.post('/tags', validateRequest({ body: addTagsSchema }), eventsController.addTags);
hostEventRouter.delete(
  '/tags/:tagId',
  validateRequest({ params: tagIdParamSchema }),
  eventsController.removeTag,
);
hostEventRouter.post('/media', eventMediaUpload, eventsController.uploadMedia);
hostEventRouter.patch(
  '/media/order',
  validateRequest({ body: reorderMediaSchema }),
  eventsController.reorderMedia,
);

eventsRouter.use(
  '/:eventId/reviews',
  (req, _res, next) => {
    const result = eventIdReviewsParamSchema.safeParse({ eventId: req.params.eventId });
    if (!result.success) {
      next('route');
      return;
    }
    next();
  },
  eventReviewsPublicRouter,
);

eventsRouter.use(
  '/:eventId',
  uuidEventIdOnly,
  hostEventRouter,
);

eventsRouter.delete(
  '/media/:mediaId',
  authenticate,
  requireHost,
  validateRequest({ params: mediaIdParamSchema }),
  eventsController.deleteMedia,
);

// Public slug — must be last
eventsRouter.get(
  '/:slug',
  optionalAuthenticate,
  validateRequest({ params: slugParamSchema }),
  eventsController.getBySlug,
);

export const categoriesRouter = Router();

categoriesRouter.get('/', eventsController.listCategories);
categoriesRouter.get(
  '/:slug',
  validateRequest({ params: categorySlugParamSchema }),
  eventsController.getCategory,
);

export const adminEventsRouter = Router();

adminEventsRouter.use(authenticate, requirePermission('events.moderate'));

adminEventsRouter.get(
  '/pending',
  validateRequest({ query: paginationQuerySchema }),
  eventsController.listPending,
);
adminEventsRouter.get(
  '/:eventId',
  validateRequest({ params: eventIdParamSchema }),
  eventsController.getAdminEvent,
);
adminEventsRouter.patch(
  '/:eventId/approve',
  validateRequest({ params: eventIdParamSchema }),
  eventsController.approve,
);
adminEventsRouter.patch(
  '/:eventId/reject',
  validateRequest({ params: eventIdParamSchema, body: rejectEventSchema }),
  eventsController.reject,
);
adminEventsRouter.patch(
  '/:eventId/feature',
  validateRequest({ params: eventIdParamSchema }),
  eventsController.feature,
);
adminEventsRouter.patch(
  '/:eventId/unfeature',
  validateRequest({ params: eventIdParamSchema }),
  eventsController.unfeature,
);
adminEventsRouter.patch(
  '/:eventId/suspend',
  validateRequest({ params: eventIdParamSchema }),
  eventsController.suspend,
);
adminEventsRouter.patch(
  '/:eventId/restore',
  validateRequest({ params: eventIdParamSchema }),
  eventsController.restore,
);

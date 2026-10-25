import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware.js';
import { requireHost, requirePermission } from '@middleware/authorize.middleware.js';
import { validateRequest } from '@middleware/validate.middleware.js';
import { reviewsController } from '../controller/reviews.controller.js';
import {
  adminReviewListQuerySchema,
  moderateReviewSchema,
  reportReviewSchema,
  reviewIdParamSchema,
  reviewListQuerySchema,
  reviewReplySchema,
  reviewTypeQuerySchema,
  submitEventReviewSchema,
  submitGuestReviewSchema,
  submitHostReviewSchema,
  updateReviewSchema,
} from '../schemas/reviews.schema.js';

export const reviewsRouter = Router();

reviewsRouter.use(authenticate);

reviewsRouter.post(
  '/event',
  validateRequest({ body: submitEventReviewSchema }),
  reviewsController.submitEventReview,
);

reviewsRouter.post(
  '/host',
  validateRequest({ body: submitHostReviewSchema }),
  reviewsController.submitHostReview,
);

reviewsRouter.post(
  '/guest',
  requireHost,
  validateRequest({ body: submitGuestReviewSchema }),
  reviewsController.submitGuestReview,
);

reviewsRouter.patch(
  '/:reviewId',
  validateRequest({ params: reviewIdParamSchema, body: updateReviewSchema }),
  reviewsController.updateReview,
);

reviewsRouter.delete(
  '/:reviewId',
  validateRequest({ params: reviewIdParamSchema, query: reviewTypeQuerySchema }),
  reviewsController.deleteReview,
);

reviewsRouter.post(
  '/:reviewId/reply',
  requireHost,
  validateRequest({ params: reviewIdParamSchema, body: reviewReplySchema }),
  reviewsController.replyToReview,
);

reviewsRouter.post(
  '/:reviewId/helpful',
  validateRequest({ params: reviewIdParamSchema, query: reviewTypeQuerySchema }),
  reviewsController.voteHelpful,
);

reviewsRouter.delete(
  '/:reviewId/helpful',
  validateRequest({ params: reviewIdParamSchema, query: reviewTypeQuerySchema }),
  reviewsController.removeHelpfulVote,
);

reviewsRouter.post(
  '/:reviewId/report',
  validateRequest({ params: reviewIdParamSchema, body: reportReviewSchema }),
  reviewsController.reportReview,
);

export const adminReviewsRouter = Router();

adminReviewsRouter.use(authenticate, requirePermission('reviews.read'));

adminReviewsRouter.get(
  '/',
  validateRequest({ query: adminReviewListQuerySchema }),
  reviewsController.listAdminReviews,
);

adminReviewsRouter.patch(
  '/:reviewId/moderate',
  requirePermission('reviews.moderate'),
  validateRequest({ params: reviewIdParamSchema, body: moderateReviewSchema }),
  reviewsController.moderateReview,
);

export const eventReviewsPublicRouter = Router({ mergeParams: true });

eventReviewsPublicRouter.get(
  '/',
  validateRequest({ query: reviewListQuerySchema }),
  reviewsController.listEventReviews,
);

export const hostReviewsPublicRouter = Router({ mergeParams: true });

hostReviewsPublicRouter.get(
  '/',
  validateRequest({ query: reviewListQuerySchema }),
  reviewsController.listHostReviews,
);

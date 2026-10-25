import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@common/index.js';
import { reviewsService } from '../service/reviews.service.js';
import type {
  AdminReviewListQuery,
  ModerateReviewInput,
  ReportReviewContractInput,
  ReportReviewInput,
  ReviewListQuery,
  ReviewReplyInput,
  SubmitEventReviewInput,
  SubmitGuestReviewInput,
  SubmitHostReviewInput,
  UpdateReviewInput,
} from '../schemas/reviews.schema.js';

function auditMeta(req: Request): { ip?: string; browser?: string } {
  const meta: { ip?: string; browser?: string } = {};
  if (req.ip) meta.ip = req.ip;
  const browser = req.headers['user-agent'];
  if (browser) meta.browser = browser;
  return meta;
}

export class ReviewsController {
  submitEventReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const review = await reviewsService.submitEventReview(
        req.user!.id,
        req.body as SubmitEventReviewInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Review submitted successfully.', data: { review } });
    } catch (error) {
      next(error);
    }
  };

  submitHostReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const review = await reviewsService.submitHostReview(
        req.user!.id,
        req.body as SubmitHostReviewInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Review submitted successfully.', data: { review } });
    } catch (error) {
      next(error);
    }
  };

  submitGuestReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const review = await reviewsService.submitGuestReview(
        req.user!.id,
        req.body as SubmitGuestReviewInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Review submitted successfully.', data: { review } });
    } catch (error) {
      next(error);
    }
  };

  updateReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reviewId } = req.params as { reviewId: string };
      const review = await reviewsService.updateReview(
        req.user!.id,
        reviewId,
        req.body as UpdateReviewInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Review updated.', data: { review } });
    } catch (error) {
      next(error);
    }
  };

  deleteReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reviewId } = req.params as { reviewId: string };
      const { type } = req.query as { type: 'event' | 'host' | 'guest' };
      await reviewsService.deleteReview(req.user!.id, reviewId, type, auditMeta(req));
      sendSuccess(res, { message: 'Review deleted.', data: {} });
    } catch (error) {
      next(error);
    }
  };

  listEventReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const result = await reviewsService.listEventReviews(
        eventId,
        req.query as unknown as ReviewListQuery,
        req.user?.id,
      );
      sendSuccess(res, { message: 'Event reviews retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  listHostReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { hostId } = req.params as { hostId: string };
      const result = await reviewsService.listHostReviews(
        hostId,
        req.query as unknown as ReviewListQuery,
        req.user?.id,
      );
      sendSuccess(res, { message: 'Host reviews retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  listMyReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await reviewsService.listMyReviews(
        req.user!.id,
        req.query as unknown as ReviewListQuery,
      );
      sendSuccess(res, { message: 'Your reviews retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  replyToReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reviewId } = req.params as { reviewId: string };
      const result = await reviewsService.replyToReview(
        req.user!.id,
        reviewId,
        req.body as ReviewReplyInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Reply posted.', data: { review: result } });
    } catch (error) {
      next(error);
    }
  };

  voteHelpful = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reviewId } = req.params as { reviewId: string };
      const { type } = req.query as { type: 'event' | 'host' | 'guest' };
      const result = await reviewsService.voteHelpful(req.user!.id, reviewId, type, auditMeta(req));
      sendSuccess(res, { message: 'Vote recorded.', data: result });
    } catch (error) {
      next(error);
    }
  };

  removeHelpfulVote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reviewId } = req.params as { reviewId: string };
      const { type } = req.query as { type: 'event' | 'host' | 'guest' };
      const result = await reviewsService.removeHelpfulVote(req.user!.id, reviewId, type);
      sendSuccess(res, { message: 'Vote removed.', data: result });
    } catch (error) {
      next(error);
    }
  };

  reportReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reviewId } = req.params as { reviewId: string };
      const result = await reviewsService.reportReview(
        req.user!.id,
        reviewId,
        req.body as ReportReviewInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Review reported.', data: result });
    } catch (error) {
      next(error);
    }
  };

  reportReviewContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as ReportReviewContractInput;
      const result = await reviewsService.reportReview(
        req.user!.id,
        body.reviewId,
        {
          type: body.type,
          reason: body.reason,
          description: body.description,
        },
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Review reported.', data: result });
    } catch (error) {
      next(error);
    }
  };

  listAdminReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await reviewsService.listAdminReviews(req.query as unknown as AdminReviewListQuery);
      sendSuccess(res, { message: 'Reviews retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  moderateReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reviewId } = req.params as { reviewId: string };
      await reviewsService.moderateReview(
        req.user!.id,
        reviewId,
        req.body as ModerateReviewInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Review moderated.', data: {} });
    } catch (error) {
      next(error);
    }
  };
}

export const reviewsController = new ReviewsController();

import type { ReviewModerationStatus, ReviewType } from '@prisma/client';
import type { REVIEWS_CONSTANTS } from '../constants/reviews.constants.js';

export type ReviewTypeSlug = (typeof REVIEWS_CONSTANTS.REVIEW_TYPES)[keyof typeof REVIEWS_CONSTANTS.REVIEW_TYPES];

export interface AuditMeta {
  ip?: string;
  browser?: string;
}

export interface ReviewStatistics {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<string, number>;
}

export interface ReviewRef {
  type: ReviewType;
  typeSlug: ReviewTypeSlug;
  id: string;
  moderationStatus: ReviewModerationStatus;
  authorId: string;
  createdAt: Date;
}

import type { ReviewModerationStatus, ReviewType } from '@prisma/client';
import { REVIEWS_CONSTANTS } from '../constants/reviews.constants.js';
import type { ReviewStatistics, ReviewTypeSlug } from '../types/reviews.types.js';

export function toPrismaReviewType(type: ReviewTypeSlug): ReviewType {
  const map: Record<ReviewTypeSlug, ReviewType> = {
    event: 'EVENT',
    host: 'HOST',
    guest: 'GUEST',
  };
  return map[type];
}

export function toReviewTypeSlug(type: ReviewType): ReviewTypeSlug {
  const map: Record<ReviewType, ReviewTypeSlug> = {
    EVENT: 'event',
    HOST: 'host',
    GUEST: 'guest',
  };
  return map[type];
}

export function validateRating(rating: number): boolean {
  return rating >= REVIEWS_CONSTANTS.RATING_MIN && rating <= REVIEWS_CONSTANTS.RATING_MAX;
}

export function isWithinEditWindow(createdAt: Date): boolean {
  const windowMs = REVIEWS_CONSTANTS.EDIT_WINDOW_HOURS * 60 * 60 * 1000;
  return Date.now() - createdAt.getTime() <= windowMs;
}

export function mapModerationStatus(filter: string): ReviewModerationStatus | undefined {
  if (filter === 'all') return undefined;
  const map: Record<string, ReviewModerationStatus> = {
    pending: 'PENDING',
    approved: 'APPROVED',
    rejected: 'REJECTED',
    hidden: 'HIDDEN',
  };
  return map[filter];
}

export function buildStatistics(
  ratings: number[],
): ReviewStatistics {
  const totalReviews = ratings.length;
  const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  let sum = 0;
  for (const r of ratings) {
    sum += r;
    const key = String(r);
    if (distribution[key] !== undefined) distribution[key] += 1;
  }
  return {
    totalReviews,
    averageRating: totalReviews > 0 ? Math.round((sum / totalReviews) * 10) / 10 : 0,
    ratingDistribution: distribution,
  };
}

export function listQueryCacheHash(query: {
  page: number;
  limit: number;
  rating?: number;
  sort: string;
}): string {
  return `${query.page}:${query.limit}:${query.rating ?? 'all'}:${query.sort}`;
}

export function publicModerationFilter(): ReviewModerationStatus {
  return 'APPROVED';
}

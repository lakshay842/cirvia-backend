import { describe, it, expect } from 'vitest';
import {
  submitEventReviewSchema,
  submitHostReviewSchema,
  submitGuestReviewSchema,
  updateReviewSchema,
  reviewListQuerySchema,
  reportReviewContractSchema,
  moderateReviewSchema,
} from '../src/modules/reviews/schemas/reviews.schema.js';
import { REVIEWS_CONSTANTS } from '../src/modules/reviews/constants/reviews.constants.js';
import {
  buildStatistics,
  isWithinEditWindow,
  validateRating,
  mapModerationStatus,
  listQueryCacheHash,
  publicModerationFilter,
} from '../src/modules/reviews/utils/reviews.util.js';

describe('Reviews schemas', () => {
  const bookingId = '550e8400-e29b-41d4-a716-446655440000';

  it('validates event review submission', () => {
    expect(
      submitEventReviewSchema.safeParse({
        bookingId,
        rating: 5,
        title: 'Great event',
        comment: 'Had a wonderful time.',
        wouldRecommend: true,
      }).success,
    ).toBe(true);
  });

  it('validates host review submission', () => {
    expect(submitHostReviewSchema.safeParse({ bookingId, rating: 4 }).success).toBe(true);
  });

  it('validates guest review submission', () => {
    expect(submitGuestReviewSchema.safeParse({ bookingId, rating: 3, comment: 'Polite guest' }).success).toBe(
      true,
    );
  });

  it('rejects unknown review fields', () => {
    expect(submitEventReviewSchema.safeParse({ bookingId, rating: 5, extra: true }).success).toBe(false);
  });

  it('requires type on update', () => {
    expect(updateReviewSchema.safeParse({ type: 'event', rating: 4 }).success).toBe(true);
    expect(updateReviewSchema.safeParse({ rating: 4 }).success).toBe(false);
  });

  it('validates list query defaults', () => {
    const parsed = reviewListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.sort).toBe('latest');
  });

  it('validates report contract body', () => {
    expect(
      reportReviewContractSchema.safeParse({
        reviewId: '550e8400-e29b-41d4-a716-446655440001',
        type: 'event',
        reason: 'Spam content',
      }).success,
    ).toBe(true);
  });

  it('validates moderate action', () => {
    expect(
      moderateReviewSchema.safeParse({ type: 'host', action: 'hide', reason: 'Policy violation' }).success,
    ).toBe(true);
  });
});

describe('Reviews utilities', () => {
  it('validates rating range', () => {
    expect(validateRating(1)).toBe(true);
    expect(validateRating(5)).toBe(true);
    expect(validateRating(0)).toBe(false);
    expect(validateRating(6)).toBe(false);
  });

  it('checks edit window', () => {
    const recent = new Date(Date.now() - 60 * 60 * 1000);
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    expect(isWithinEditWindow(recent)).toBe(true);
    expect(isWithinEditWindow(old)).toBe(false);
  });

  it('builds statistics with distribution', () => {
    const stats = buildStatistics([5, 4, 4, 3]);
    expect(stats.totalReviews).toBe(4);
    expect(stats.averageRating).toBe(4);
    expect(stats.ratingDistribution['5']).toBe(1);
    expect(stats.ratingDistribution['4']).toBe(2);
  });

  it('maps moderation status filters', () => {
    expect(mapModerationStatus('pending')).toBe('PENDING');
    expect(mapModerationStatus('all')).toBeUndefined();
  });

  it('builds list cache hash', () => {
    expect(listQueryCacheHash({ page: 1, limit: 20, sort: 'latest' })).toBe('1:20:all:latest');
  });

  it('defaults public moderation filter to approved', () => {
    expect(publicModerationFilter()).toBe('APPROVED');
  });

  it('defines redis stats keys', () => {
    expect(REVIEWS_CONSTANTS.REDIS_KEYS.eventStats('evt-1')).toBe('cache:reviews:event:stats:evt-1');
    expect(REVIEWS_CONSTANTS.REDIS_KEYS.hostStats('host-1')).toBe('cache:reviews:host:stats:host-1');
  });
});

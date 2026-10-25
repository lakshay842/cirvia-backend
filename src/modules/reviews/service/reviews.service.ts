import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@errors/index.js';
import { getRedisClient } from '@redis/index.js';
import type { ReviewType } from '@prisma/client';
import { buildPaginationMeta, parsePagination } from '../../../utils/pagination.util.js';
import { REVIEWS_CONSTANTS } from '../constants/reviews.constants.js';
import { toReviewDto, toReviewStatisticsDto } from '../dto/reviews.dto.js';
import { emitReviewDomainEvent } from '../events/reviews.events.js';
import { enqueueReviewJob } from '../events/reviews.queue.js';
import { reviewsRepository } from '../repository/reviews.repository.js';
import {
  buildStatistics,
  isWithinEditWindow,
  mapModerationStatus,
  publicModerationFilter,
  toPrismaReviewType,
  validateRating,
} from '../utils/reviews.util.js';
import type { AuditMeta } from '../types/reviews.types.js';
import type {
  AdminReviewListQuery,
  ModerateReviewInput,
  ReportReviewInput,
  ReviewListQuery,
  ReviewReplyInput,
  SubmitEventReviewInput,
  SubmitGuestReviewInput,
  SubmitHostReviewInput,
  UpdateReviewInput,
} from '../schemas/reviews.schema.js';

export class ReviewsService {
  private async writeAudit(
    action: string,
    entityId: string,
    userId?: string,
    changes?: Record<string, unknown>,
    audit?: AuditMeta,
  ): Promise<void> {
    await reviewsRepository.createAuditLog({
      action,
      entityId,
      ...(userId !== undefined && { userId }),
      ...(changes !== undefined && { changes }),
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
  }

  private async invalidateEventCache(eventId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(REVIEWS_CONSTANTS.REDIS_KEYS.eventStats(eventId));
    } catch {
      // optional
    }
  }

  private async invalidateHostCache(hostId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(REVIEWS_CONSTANTS.REDIS_KEYS.hostStats(hostId));
    } catch {
      // optional
    }
  }

  private assertRating(rating: number): void {
    if (!validateRating(rating)) {
      throw new ValidationError('Rating must be between 1 and 5.', {
        details: { code: REVIEWS_CONSTANTS.ERROR_CODES.INVALID_RATING },
      });
    }
  }

  private async assertCompletedBooking(bookingId: string, userId: string, role: 'guest' | 'host') {
    const booking = await reviewsRepository.findBookingForReview(bookingId);
    if (!booking) throw new NotFoundError('Booking not found.');

    if (booking.bookingStatus !== 'COMPLETED') {
      throw new ValidationError('Only completed bookings can be reviewed.', {
        details: { code: REVIEWS_CONSTANTS.ERROR_CODES.BOOKING_NOT_COMPLETED },
      });
    }

    if (role === 'guest' && booking.userId !== userId) {
      throw new ForbiddenError('You can only review your own completed bookings.');
    }

    if (role === 'host') {
      const host = await reviewsRepository.findHostByUserId(userId);
      if (!host || host.id !== booking.event.hostId) {
        throw new ForbiddenError('Only the event host can review guests for this booking.');
      }
    }

    return booking;
  }

  private async saveMedia(reviewType: ReviewType, reviewId: string, mediaUrls?: string[]) {
    if (!mediaUrls?.length) return;
    const items = mediaUrls.slice(0, REVIEWS_CONSTANTS.MAX_MEDIA_PER_REVIEW).map((url, index) => ({
      reviewType,
      reviewId,
      url,
      sortOrder: index,
    }));
    await reviewsRepository.createMedia(items);
  }

  async submitEventReview(userId: string, input: SubmitEventReviewInput, audit?: AuditMeta) {
    this.assertRating(input.rating);
    const booking = await this.assertCompletedBooking(input.bookingId, userId, 'guest');
    if (booking.eventReview) {
      throw new ConflictError('A review already exists for this booking.', {
        details: { code: REVIEWS_CONSTANTS.ERROR_CODES.REVIEW_ALREADY_EXISTS },
      });
    }

    const review = await reviewsRepository.createEventReview({
      bookingId: input.bookingId,
      eventId: booking.eventId,
      userId,
      rating: input.rating,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.comment !== undefined && { comment: input.comment }),
      wouldRecommend: input.wouldRecommend ?? true,
    });

    await this.saveMedia('EVENT', review.id, input.mediaUrls);
    await this.invalidateEventCache(booking.eventId);
    await this.writeAudit(REVIEWS_CONSTANTS.AUDIT_ACTIONS.SUBMITTED, review.id, userId, { type: 'event' }, audit);
    emitReviewDomainEvent('review.submitted', { reviewId: review.id, type: 'event', userId, eventId: booking.eventId });
    await enqueueReviewJob(REVIEWS_CONSTANTS.JOB_TYPES.RECALC_TRUST_SCORE, { userId });
    await enqueueReviewJob(REVIEWS_CONSTANTS.JOB_TYPES.RECALC_EVENT_STATS, { eventId: booking.eventId });

    return toReviewDto('EVENT', review);
  }

  async submitHostReview(userId: string, input: SubmitHostReviewInput, audit?: AuditMeta) {
    this.assertRating(input.rating);
    const booking = await this.assertCompletedBooking(input.bookingId, userId, 'guest');
    if (booking.hostReview) {
      throw new ConflictError('A review already exists for this booking.', {
        details: { code: REVIEWS_CONSTANTS.ERROR_CODES.REVIEW_ALREADY_EXISTS },
      });
    }

    const review = await reviewsRepository.createHostReview({
      bookingId: input.bookingId,
      eventId: booking.eventId,
      hostId: booking.event.hostId,
      reviewerId: userId,
      rating: input.rating,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.comment !== undefined && { comment: input.comment }),
      wouldRecommend: input.wouldRecommend ?? true,
    });

    await this.saveMedia('HOST', review.id, input.mediaUrls);
    await this.invalidateHostCache(booking.event.hostId);
    await this.writeAudit(REVIEWS_CONSTANTS.AUDIT_ACTIONS.SUBMITTED, review.id, userId, { type: 'host' }, audit);
    emitReviewDomainEvent('review.submitted', { reviewId: review.id, type: 'host', userId, hostId: booking.event.hostId });
    const hostRecord = await reviewsRepository.findHostById(booking.event.hostId);
    if (hostRecord) {
      await enqueueReviewJob(REVIEWS_CONSTANTS.JOB_TYPES.RECALC_TRUST_SCORE, { userId: hostRecord.userId });
    }
    await enqueueReviewJob(REVIEWS_CONSTANTS.JOB_TYPES.RECALC_HOST_RATING, { hostId: booking.event.hostId });

    return toReviewDto('HOST', review);
  }

  async submitGuestReview(userId: string, input: SubmitGuestReviewInput, audit?: AuditMeta) {
    this.assertRating(input.rating);
    const booking = await this.assertCompletedBooking(input.bookingId, userId, 'host');
    if (booking.guestReview) {
      throw new ConflictError('A review already exists for this booking.', {
        details: { code: REVIEWS_CONSTANTS.ERROR_CODES.REVIEW_ALREADY_EXISTS },
      });
    }

    const review = await reviewsRepository.createGuestReview({
      bookingId: input.bookingId,
      hostId: booking.event.hostId,
      guestId: booking.userId,
      rating: input.rating,
      ...(input.comment !== undefined && { comment: input.comment }),
    });

    await this.saveMedia('GUEST', review.id, input.mediaUrls);
    await this.writeAudit(REVIEWS_CONSTANTS.AUDIT_ACTIONS.SUBMITTED, review.id, userId, { type: 'guest' }, audit);
    emitReviewDomainEvent('review.submitted', { reviewId: review.id, type: 'guest', userId, guestId: booking.userId });
    await enqueueReviewJob(REVIEWS_CONSTANTS.JOB_TYPES.RECALC_TRUST_SCORE, { userId: booking.userId });

    return toReviewDto('GUEST', review);
  }

  private async findReview(type: ReviewType, reviewId: string) {
    switch (type) {
      case 'EVENT':
        return reviewsRepository.findEventReview(reviewId);
      case 'HOST':
        return reviewsRepository.findHostReview(reviewId);
      case 'GUEST':
        return reviewsRepository.findGuestReview(reviewId);
    }
  }

  private getReviewAuthorId(type: ReviewType, review: { userId?: string; reviewerId?: string; guestId?: string }) {
    if (type === 'EVENT') return review.userId!;
    if (type === 'HOST') return review.reviewerId!;
    return review.guestId!;
  }

  async updateReview(userId: string, reviewId: string, input: UpdateReviewInput, audit?: AuditMeta) {
    const type = toPrismaReviewType(input.type);
    const review = await this.findReview(type, reviewId);
    if (!review) throw new NotFoundError('Review not found.');

    const authorId = this.getReviewAuthorId(type, review as { userId?: string; reviewerId?: string; guestId?: string });
    if (authorId !== userId) {
      throw new ForbiddenError('You can only edit your own reviews.');
    }
    if (!isWithinEditWindow(review.createdAt)) {
      throw new ValidationError('Reviews can only be edited within 24 hours.', {
        details: { code: REVIEWS_CONSTANTS.ERROR_CODES.REVIEW_EDIT_WINDOW_EXPIRED },
      });
    }

    const data = {
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.comment !== undefined && { comment: input.comment }),
      ...(input.wouldRecommend !== undefined && { wouldRecommend: input.wouldRecommend }),
    };

    let updated;
    switch (type) {
      case 'EVENT':
        updated = await reviewsRepository.updateEventReview(reviewId, data);
        await this.invalidateEventCache((review as { eventId: string }).eventId);
        break;
      case 'HOST':
        updated = await reviewsRepository.updateHostReview(reviewId, data);
        await this.invalidateHostCache((review as { hostId: string }).hostId);
        break;
      case 'GUEST':
        updated = await reviewsRepository.updateGuestReview(reviewId, data);
        break;
    }

    await this.writeAudit(REVIEWS_CONSTANTS.AUDIT_ACTIONS.UPDATED, reviewId, userId, data, audit);
    emitReviewDomainEvent('review.updated', { reviewId, type: input.type, userId });
    return toReviewDto(type, updated!);
  }

  async deleteReview(userId: string, reviewId: string, typeSlug: 'event' | 'host' | 'guest', audit?: AuditMeta) {
    const type = toPrismaReviewType(typeSlug);
    const review = await this.findReview(type, reviewId);
    if (!review) throw new NotFoundError('Review not found.');

    const authorId = this.getReviewAuthorId(type, review as { userId?: string; reviewerId?: string; guestId?: string });
    if (authorId !== userId) {
      throw new ForbiddenError('You can only delete your own reviews.');
    }

    switch (type) {
      case 'EVENT':
        await reviewsRepository.softDeleteEventReview(reviewId);
        await this.invalidateEventCache((review as { eventId: string }).eventId);
        break;
      case 'HOST':
        await reviewsRepository.softDeleteHostReview(reviewId);
        await this.invalidateHostCache((review as { hostId: string }).hostId);
        break;
      case 'GUEST':
        await reviewsRepository.softDeleteGuestReview(reviewId);
        break;
    }

    await this.writeAudit(REVIEWS_CONSTANTS.AUDIT_ACTIONS.DELETED, reviewId, userId, { type: typeSlug }, audit);
    emitReviewDomainEvent('review.deleted', { reviewId, type: typeSlug, userId });
  }

  async listEventReviews(eventId: string, query: ReviewListQuery, viewerId?: string) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const moderationStatus = publicModerationFilter();

    const { items, total } = await reviewsRepository.listEventReviews({
      eventId,
      moderationStatus,
      ...(query.rating !== undefined && { rating: query.rating }),
      sort: query.sort,
      skip,
      take: limit,
    });

    const statistics = await this.getEventStatistics(eventId);
    const reviews = await Promise.all(
      items.map(async (r) => {
        const [reply, media] = await Promise.all([
          reviewsRepository.findReply('EVENT', r.id),
          reviewsRepository.listMedia('EVENT', r.id),
        ]);
        const userVoted = viewerId ? await reviewsRepository.hasVote('EVENT', r.id, viewerId) : false;
        return toReviewDto('EVENT', r, { reply, media, userVoted });
      }),
    );

    return {
      reviews,
      statistics,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async listHostReviews(hostId: string, query: ReviewListQuery, viewerId?: string) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const moderationStatus = publicModerationFilter();

    const { items, total } = await reviewsRepository.listHostReviews({
      hostId,
      moderationStatus,
      ...(query.rating !== undefined && { rating: query.rating }),
      sort: query.sort,
      skip,
      take: limit,
    });

    const statistics = await this.getHostStatistics(hostId);
    const reviews = await Promise.all(
      items.map(async (r) => {
        const [reply, media] = await Promise.all([
          reviewsRepository.findReply('HOST', r.id),
          reviewsRepository.listMedia('HOST', r.id),
        ]);
        const userVoted = viewerId ? await reviewsRepository.hasVote('HOST', r.id, viewerId) : false;
        return toReviewDto('HOST', r, { reply, media, userVoted });
      }),
    );

    return {
      reviews,
      statistics,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async listMyReviews(userId: string, query: ReviewListQuery) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const { items, total } = await reviewsRepository.listUserReviews(userId, skip, limit);

    const reviews = await Promise.all(
      items.map(async ({ type, review }) => {
        const [reply, media] = await Promise.all([
          reviewsRepository.findReply(type, review.id),
          reviewsRepository.listMedia(type, review.id),
        ]);
        return toReviewDto(type, review, { reply, media });
      }),
    );

    return { reviews, meta: buildPaginationMeta(page, limit, total) };
  }

  async getEventStatistics(eventId: string) {
    try {
      const redis = getRedisClient();
      const cached = await redis.get(REVIEWS_CONSTANTS.REDIS_KEYS.eventStats(eventId));
      if (cached) return toReviewStatisticsDto(JSON.parse(cached));
    } catch {
      // ignore
    }

    const ratings = await reviewsRepository.getEventRatings(eventId);
    const stats = buildStatistics(ratings);

    try {
      const redis = getRedisClient();
      await redis.setex(
        REVIEWS_CONSTANTS.REDIS_KEYS.eventStats(eventId),
        REVIEWS_CONSTANTS.REDIS_TTL.stats,
        JSON.stringify(stats),
      );
    } catch {
      // ignore
    }

    return toReviewStatisticsDto(stats);
  }

  async getHostStatistics(hostId: string) {
    try {
      const redis = getRedisClient();
      const cached = await redis.get(REVIEWS_CONSTANTS.REDIS_KEYS.hostStats(hostId));
      if (cached) return toReviewStatisticsDto(JSON.parse(cached));
    } catch {
      // ignore
    }

    const ratings = await reviewsRepository.getHostRatings(hostId);
    const stats = buildStatistics(ratings);

    try {
      const redis = getRedisClient();
      await redis.setex(
        REVIEWS_CONSTANTS.REDIS_KEYS.hostStats(hostId),
        REVIEWS_CONSTANTS.REDIS_TTL.stats,
        JSON.stringify(stats),
      );
    } catch {
      // ignore
    }

    return toReviewStatisticsDto(stats);
  }

  async replyToReview(hostUserId: string, reviewId: string, input: ReviewReplyInput, audit?: AuditMeta) {
    const type = toPrismaReviewType(input.type);
    const review = await this.findReview(type, reviewId);
    if (!review) throw new NotFoundError('Review not found.');

    const host = await reviewsRepository.findHostByUserId(hostUserId);
    if (!host) throw new ForbiddenError('Host access required.');

    if (type === 'HOST' && (review as { hostId: string }).hostId !== host.id) {
      throw new ForbiddenError('You can only reply to reviews on your host profile.');
    }
    if (type === 'EVENT') {
      const eventReview = review as { eventId: string };
      const event = await prismaEventHostCheck(eventReview.eventId, host.id);
      if (!event) throw new ForbiddenError('You can only reply to reviews on your events.');
    }
    if (type === 'GUEST') {
      throw new ForbiddenError('Hosts cannot reply to guest reviews.');
    }

    const existing = await reviewsRepository.findReply(type, reviewId);
    if (existing) {
      throw new ConflictError('A reply already exists for this review.', {
        details: { code: REVIEWS_CONSTANTS.ERROR_CODES.REPLY_ALREADY_EXISTS },
      });
    }

    const reply = await reviewsRepository.createReply({
      reviewType: type,
      reviewId,
      authorId: hostUserId,
      comment: input.comment,
    });

    await this.writeAudit(REVIEWS_CONSTANTS.AUDIT_ACTIONS.REPLIED, reviewId, hostUserId, {}, audit);
    emitReviewDomainEvent('review.replied', { reviewId, type: input.type, hostUserId });
    return toReviewDto(type, review, { reply });
  }

  async voteHelpful(userId: string, reviewId: string, typeSlug: 'event' | 'host' | 'guest', audit?: AuditMeta) {
    const type = toPrismaReviewType(typeSlug);
    const review = await this.findReview(type, reviewId);
    if (!review) throw new NotFoundError('Review not found.');

    const hasVote = await reviewsRepository.hasVote(type, reviewId, userId);
    if (hasVote) return { voted: true };

    await reviewsRepository.createVote(type, reviewId, userId);
    await reviewsRepository.incrementHelpful(type, reviewId, 1);
    await this.writeAudit(REVIEWS_CONSTANTS.AUDIT_ACTIONS.VOTED, reviewId, userId, { helpful: true }, audit);
    return { voted: true };
  }

  async removeHelpfulVote(userId: string, reviewId: string, typeSlug: 'event' | 'host' | 'guest') {
    const type = toPrismaReviewType(typeSlug);
    const deleted = await reviewsRepository.deleteVote(type, reviewId, userId);
    if (deleted.count > 0) {
      await reviewsRepository.incrementHelpful(type, reviewId, -1);
    }
    return { voted: false };
  }

  async reportReview(userId: string, reviewId: string, input: ReportReviewInput, audit?: AuditMeta) {
    const type = toPrismaReviewType(input.type);
    const review = await this.findReview(type, reviewId);
    if (!review) throw new NotFoundError('Review not found.');

    try {
      const report = await reviewsRepository.createReviewReport({
        reporterId: userId,
        reviewType: type,
        reviewId,
        reason: input.reason,
        ...(input.description !== undefined && { description: input.description }),
      });
      await this.writeAudit(REVIEWS_CONSTANTS.AUDIT_ACTIONS.REPORTED, reviewId, userId, { reportId: report.id }, audit);
      emitReviewDomainEvent('review.reported', { reviewId, type: input.type, reporterId: userId });
      return { reportId: report.id };
    } catch {
      throw new ConflictError('You have already reported this review.', {
        details: { code: REVIEWS_CONSTANTS.ERROR_CODES.REPORT_ALREADY_SUBMITTED },
      });
    }
  }

  async listAdminReviews(query: AdminReviewListQuery) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const moderationStatus = mapModerationStatus(query.status);
    const reviewType = query.type === 'all' ? undefined : toPrismaReviewType(query.type);

    const { items, total } = await reviewsRepository.listAdminReviews({
      ...(moderationStatus !== undefined && { moderationStatus }),
      ...(reviewType !== undefined && { reviewType }),
      skip,
      take: limit,
    });

    const reviews = items.map(({ type, review }) => toReviewDto(type, review as never));
    return { reviews, meta: buildPaginationMeta(page, limit, total) };
  }

  async moderateReview(adminId: string, reviewId: string, input: ModerateReviewInput, audit?: AuditMeta) {
    const type = toPrismaReviewType(input.type);
    const review = await this.findReview(type, reviewId);
    if (!review) throw new NotFoundError('Review not found.');

    const statusMap = {
      approve: 'APPROVED' as const,
      reject: 'REJECTED' as const,
      hide: 'HIDDEN' as const,
    };

    await reviewsRepository.setModerationStatus(type, reviewId, statusMap[input.action]);

    if (type === 'HOST') {
      await this.invalidateHostCache((review as { hostId: string }).hostId);
      await enqueueReviewJob(REVIEWS_CONSTANTS.JOB_TYPES.RECALC_HOST_RATING, {
        hostId: (review as { hostId: string }).hostId,
      });
    }
    if (type === 'EVENT') {
      await this.invalidateEventCache((review as { eventId: string }).eventId);
    }

    await this.writeAudit(
      REVIEWS_CONSTANTS.AUDIT_ACTIONS.MODERATED,
      reviewId,
      adminId,
      { action: input.action, reason: input.reason },
      audit,
    );
    emitReviewDomainEvent('review.moderated', { reviewId, type: input.type, adminId, action: input.action });
  }

  async processRecalcTrustScore(userId: string): Promise<void> {
    await reviewsRepository.upsertTrustScorePositive(userId);
  }

  async processRecalcHostRating(hostId: string): Promise<void> {
    await reviewsRepository.recalcHostRating(hostId);
  }

  async processRecalcEventStats(eventId: string): Promise<void> {
    await this.invalidateEventCache(eventId);
    await this.getEventStatistics(eventId);
  }
}

async function prismaEventHostCheck(eventId: string, hostId: string): Promise<boolean> {
  const { prisma } = await import('@database/index.js');
  const event = await prisma.event.findFirst({ where: { id: eventId, hostId } });
  return Boolean(event);
}

export const reviewsService = new ReviewsService();

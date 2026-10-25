import { prisma } from '@database/index.js';
import type {
  Prisma,
  ReviewModerationStatus,
  ReviewType,
} from '@prisma/client';

const notDeleted = { deletedAt: null };

export class ReviewsRepository {
  async findBookingForReview(bookingId: string) {
    return prisma.eventBooking.findUnique({
      where: { id: bookingId },
      include: {
        event: { select: { id: true, hostId: true, eventEnd: true, status: true } },
        hostReview: true,
        guestReview: true,
        eventReview: true,
      },
    });
  }

  async findHostByUserId(userId: string) {
    return prisma.hostProfile.findFirst({ where: { userId, deletedAt: null } });
  }

  async findHostById(hostId: string) {
    return prisma.hostProfile.findUnique({ where: { id: hostId } });
  }

  async createEventReview(data: {
    bookingId: string;
    eventId: string;
    userId: string;
    rating: number;
    title?: string;
    comment?: string;
    wouldRecommend?: boolean;
  }) {
    return prisma.eventReview.create({ data });
  }

  async createHostReview(data: {
    bookingId: string;
    eventId: string;
    hostId: string;
    reviewerId: string;
    rating: number;
    title?: string;
    comment?: string;
    wouldRecommend?: boolean;
  }) {
    return prisma.hostReview.create({ data });
  }

  async createGuestReview(data: {
    bookingId: string;
    hostId: string;
    guestId: string;
    rating: number;
    comment?: string;
  }) {
    return prisma.guestReview.create({ data });
  }

  async findEventReview(id: string) {
    return prisma.eventReview.findFirst({
      where: { id, ...notDeleted },
      include: { user: { include: { profile: true } } },
    });
  }

  async findHostReview(id: string) {
    return prisma.hostReview.findFirst({
      where: { id, ...notDeleted },
      include: { reviewer: { include: { profile: true } } },
    });
  }

  async findGuestReview(id: string) {
    return prisma.guestReview.findFirst({
      where: { id, ...notDeleted },
      include: { guest: { include: { profile: true } } },
    });
  }

  async updateEventReview(id: string, data: Prisma.EventReviewUpdateInput) {
    return prisma.eventReview.update({ where: { id }, data });
  }

  async updateHostReview(id: string, data: Prisma.HostReviewUpdateInput) {
    return prisma.hostReview.update({ where: { id }, data });
  }

  async updateGuestReview(id: string, data: Prisma.GuestReviewUpdateInput) {
    return prisma.guestReview.update({ where: { id }, data });
  }

  async softDeleteEventReview(id: string) {
    return prisma.eventReview.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async softDeleteHostReview(id: string) {
    return prisma.hostReview.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async softDeleteGuestReview(id: string) {
    return prisma.guestReview.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async listEventReviews(params: {
    eventId: string;
    moderationStatus?: ReviewModerationStatus;
    rating?: number;
    sort: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.EventReviewWhereInput = {
      eventId: params.eventId,
      ...notDeleted,
      ...(params.moderationStatus && { moderationStatus: params.moderationStatus }),
      ...(params.rating !== undefined && { rating: params.rating }),
    };
    const orderBy = this.buildOrderBy(params.sort);
    const [items, total] = await Promise.all([
      prisma.eventReview.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
        include: { user: { include: { profile: true } } },
      }),
      prisma.eventReview.count({ where }),
    ]);
    return { items, total };
  }

  async listHostReviews(params: {
    hostId: string;
    moderationStatus?: ReviewModerationStatus;
    rating?: number;
    sort: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.HostReviewWhereInput = {
      hostId: params.hostId,
      ...notDeleted,
      ...(params.moderationStatus && { moderationStatus: params.moderationStatus }),
      ...(params.rating !== undefined && { rating: params.rating }),
    };
    const orderBy = this.buildOrderBy(params.sort);
    const [items, total] = await Promise.all([
      prisma.hostReview.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
        include: { reviewer: { include: { profile: true } } },
      }),
      prisma.hostReview.count({ where }),
    ]);
    return { items, total };
  }

  async listUserReviews(userId: string, skip: number, take: number) {
    const [eventReviews, hostReviews, guestReviews] = await Promise.all([
      prisma.eventReview.findMany({
        where: { userId, ...notDeleted },
        orderBy: { createdAt: 'desc' },
        include: { user: { include: { profile: true } } },
      }),
      prisma.hostReview.findMany({
        where: { reviewerId: userId, ...notDeleted },
        orderBy: { createdAt: 'desc' },
        include: { reviewer: { include: { profile: true } } },
      }),
      prisma.guestReview.findMany({
        where: { guestId: userId, ...notDeleted },
        orderBy: { createdAt: 'desc' },
        include: { guest: { include: { profile: true } } },
      }),
    ]);

    const combined = [
      ...eventReviews.map((r) => ({ type: 'EVENT' as const, review: r, createdAt: r.createdAt })),
      ...hostReviews.map((r) => ({ type: 'HOST' as const, review: r, createdAt: r.createdAt })),
      ...guestReviews.map((r) => ({ type: 'GUEST' as const, review: r, createdAt: r.createdAt })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = combined.length;
    const items = combined.slice(skip, skip + take);
    return { items, total };
  }

  async getEventRatings(eventId: string, moderationStatus: ReviewModerationStatus = 'APPROVED') {
    const reviews = await prisma.eventReview.findMany({
      where: { eventId, moderationStatus, ...notDeleted },
      select: { rating: true },
    });
    return reviews.map((r) => r.rating);
  }

  async getHostRatings(hostId: string, moderationStatus: ReviewModerationStatus = 'APPROVED') {
    const reviews = await prisma.hostReview.findMany({
      where: { hostId, moderationStatus, ...notDeleted },
      select: { rating: true },
    });
    return reviews.map((r) => r.rating);
  }

  async createMedia(items: Array<{ reviewType: ReviewType; reviewId: string; url: string; sortOrder: number }>) {
    if (items.length === 0) return [];
    return prisma.$transaction(
      items.map((item) =>
        prisma.reviewMedia.create({
          data: {
            reviewType: item.reviewType,
            reviewId: item.reviewId,
            url: item.url,
            sortOrder: item.sortOrder,
          },
        }),
      ),
    );
  }

  async listMedia(reviewType: ReviewType, reviewId: string) {
    return prisma.reviewMedia.findMany({
      where: { reviewType, reviewId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createReply(data: {
    reviewType: ReviewType;
    reviewId: string;
    authorId: string;
    comment: string;
  }) {
    return prisma.reviewReply.create({
      data,
      include: { author: { include: { profile: true } } },
    });
  }

  async findReply(reviewType: ReviewType, reviewId: string) {
    return prisma.reviewReply.findFirst({
      where: { reviewType, reviewId, deletedAt: null },
      include: { author: { include: { profile: true } } },
    });
  }

  async createVote(reviewType: ReviewType, reviewId: string, userId: string) {
    return prisma.reviewVote.create({ data: { reviewType, reviewId, userId } });
  }

  async deleteVote(reviewType: ReviewType, reviewId: string, userId: string) {
    return prisma.reviewVote.deleteMany({ where: { reviewType, reviewId, userId } });
  }

  async hasVote(reviewType: ReviewType, reviewId: string, userId: string) {
    const vote = await prisma.reviewVote.findUnique({
      where: { reviewType_reviewId_userId: { reviewType, reviewId, userId } },
    });
    return Boolean(vote);
  }

  async incrementHelpful(reviewType: ReviewType, reviewId: string, delta: number) {
    switch (reviewType) {
      case 'EVENT':
        return prisma.eventReview.update({ where: { id: reviewId }, data: { helpfulCount: { increment: delta } } });
      case 'HOST':
        return prisma.hostReview.update({ where: { id: reviewId }, data: { helpfulCount: { increment: delta } } });
      case 'GUEST':
        return prisma.guestReview.update({ where: { id: reviewId }, data: { helpfulCount: { increment: delta } } });
    }
  }

  async createReviewReport(data: {
    reporterId: string;
    reviewType: ReviewType;
    reviewId: string;
    reason: string;
    description?: string;
  }) {
    return prisma.reviewReport.create({ data });
  }

  async listAdminReviews(params: {
    moderationStatus?: ReviewModerationStatus;
    reviewType?: ReviewType;
    skip: number;
    take: number;
  }) {
    const status = params.moderationStatus;
    const results: Array<{ type: ReviewType; review: unknown; createdAt: Date }> = [];

    if (!params.reviewType || params.reviewType === 'EVENT') {
      const eventReviews = await prisma.eventReview.findMany({
        where: { ...notDeleted, ...(status && { moderationStatus: status }) },
        include: { user: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
      });
      results.push(...eventReviews.map((r) => ({ type: 'EVENT' as const, review: r, createdAt: r.createdAt })));
    }

    if (!params.reviewType || params.reviewType === 'HOST') {
      const hostReviews = await prisma.hostReview.findMany({
        where: { ...notDeleted, ...(status && { moderationStatus: status }) },
        include: { reviewer: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
      });
      results.push(...hostReviews.map((r) => ({ type: 'HOST' as const, review: r, createdAt: r.createdAt })));
    }

    if (!params.reviewType || params.reviewType === 'GUEST') {
      const guestReviews = await prisma.guestReview.findMany({
        where: { ...notDeleted, ...(status && { moderationStatus: status }) },
        include: { guest: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
      });
      results.push(...guestReviews.map((r) => ({ type: 'GUEST' as const, review: r, createdAt: r.createdAt })));
    }

    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { items: results.slice(params.skip, params.skip + params.take), total: results.length };
  }

  async setModerationStatus(reviewType: ReviewType, reviewId: string, status: ReviewModerationStatus) {
    switch (reviewType) {
      case 'EVENT':
        return prisma.eventReview.update({ where: { id: reviewId }, data: { moderationStatus: status } });
      case 'HOST':
        return prisma.hostReview.update({ where: { id: reviewId }, data: { moderationStatus: status } });
      case 'GUEST':
        return prisma.guestReview.update({ where: { id: reviewId }, data: { moderationStatus: status } });
    }
  }

  async recalcHostRating(hostId: string) {
    const agg = await prisma.hostReview.aggregate({
      where: { hostId, moderationStatus: 'APPROVED', ...notDeleted },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.hostProfile.update({
      where: { id: hostId },
      data: {
        hostRating: agg._avg.rating ?? 0,
        totalReviews: agg._count.rating,
      },
    });
  }

  async upsertTrustScorePositive(userId: string) {
    const existing = await prisma.trustScore.findUnique({ where: { userId } });
    const oldScore = existing?.score ?? 0;
    const newScore = Math.min(100, oldScore + 2);
    await prisma.trustScore.upsert({
      where: { userId },
      create: { userId, score: newScore, positiveReviews: 1 },
      update: { score: newScore, positiveReviews: { increment: 1 }, lastUpdated: new Date() },
    });
    await prisma.trustScoreHistory.create({
      data: {
        userId,
        oldScore,
        newScore,
        reason: 'POSITIVE_REVIEW',
      },
    });
  }

  async createAuditLog(params: {
    action: string;
    entityId: string;
    userId?: string;
    changes?: Record<string, unknown>;
    ip?: string;
    browser?: string;
  }) {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: 'review',
        entityId: params.entityId,
        ...(params.userId && { userId: params.userId }),
        ...(params.changes && { changes: params.changes as Prisma.InputJsonValue }),
        ...(params.ip && { ip: params.ip }),
        ...(params.browser && { browser: params.browser }),
      },
    });
  }

  private buildOrderBy(sort: string): Prisma.EventReviewOrderByWithRelationInput {
    switch (sort) {
      case 'oldest':
        return { createdAt: 'asc' };
      case 'highest':
        return { rating: 'desc' };
      case 'lowest':
        return { rating: 'asc' };
      case 'helpful':
        return { helpfulCount: 'desc' };
      default:
        return { createdAt: 'desc' };
    }
  }
}

export const reviewsRepository = new ReviewsRepository();

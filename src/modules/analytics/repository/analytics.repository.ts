import { prisma } from '@database/index.js';
import type { Prisma } from '@prisma/client';
import type { DateRange } from '../types/analytics.types.js';

export class AnalyticsRepository {
  async countUsers(range?: DateRange) {
    return prisma.user.count({
      where: {
        isDeleted: false,
        deletedAt: null,
        ...(range && { createdAt: { gte: range.from, lte: range.to } }),
      },
    });
  }

  async countHosts(range?: DateRange) {
    return prisma.hostProfile.count({
      where: {
        deletedAt: null,
        ...(range && { createdAt: { gte: range.from, lte: range.to } }),
      },
    });
  }

  async countEvents(range?: DateRange, liveOnly = false) {
    return prisma.event.count({
      where: {
        deletedAt: null,
        ...(liveOnly && { status: 'PUBLISHED', isSuspended: false }),
        ...(range && { createdAt: { gte: range.from, lte: range.to } }),
      },
    });
  }

  async countBookings(range?: DateRange, status?: Prisma.EnumBookingStatusFilter['equals']) {
    return prisma.eventBooking.count({
      where: {
        deletedAt: null,
        ...(status && { bookingStatus: status }),
        ...(range && { createdAt: { gte: range.from, lte: range.to } }),
      },
    });
  }

  async paymentAggregates(range?: DateRange) {
    const where: Prisma.PaymentWhereInput = {
      deletedAt: null,
      ...(range && { createdAt: { gte: range.from, lte: range.to } }),
    };

    const [totals, succeeded, failed] = await Promise.all([
      prisma.payment.aggregate({
        where: { ...where, paymentStatus: 'CAPTURED' },
        _sum: { amount: true, platformFee: true, netAmount: true },
        _count: true,
      }),
      prisma.payment.count({ where: { ...where, paymentStatus: 'CAPTURED' } }),
      prisma.payment.count({ where: { ...where, paymentStatus: 'FAILED' } }),
    ]);

    return {
      totalAmount: Number(totals._sum.amount ?? 0),
      platformFees: Number(totals._sum.platformFee ?? 0),
      netAmount: Number(totals._sum.netAmount ?? 0),
      count: totals._count,
      succeeded,
      failed,
    };
  }

  async walletAggregates() {
    const agg = await prisma.wallet.aggregate({
      _sum: {
        availableBalance: true,
        pendingBalance: true,
        lifetimeWithdrawals: true,
      },
    });
    return {
      availableBalance: Number(agg._sum.availableBalance ?? 0),
      pendingBalance: Number(agg._sum.pendingBalance ?? 0),
      lifetimeWithdrawals: Number(agg._sum.lifetimeWithdrawals ?? 0),
    };
  }

  async withdrawalCounts() {
    const [pending, completed, rejected] = await Promise.all([
      prisma.hostPayout.count({ where: { status: 'PENDING' } }),
      prisma.hostPayout.count({ where: { status: 'COMPLETED' } }),
      prisma.hostPayout.count({ where: { status: { in: ['FAILED', 'CANCELLED'] } } }),
    ]);
    return { pending, completed, rejected };
  }

  async reviewAggregates() {
    const [eventAgg, hostAgg, guestAgg] = await Promise.all([
      prisma.eventReview.aggregate({ where: { deletedAt: null }, _avg: { rating: true }, _count: true }),
      prisma.hostReview.aggregate({ where: { deletedAt: null }, _avg: { rating: true }, _count: true }),
      prisma.guestReview.aggregate({ where: { deletedAt: null }, _avg: { rating: true }, _count: true }),
    ]);
    const total = eventAgg._count + hostAgg._count + guestAgg._count;
    const weighted =
      (Number(eventAgg._avg.rating ?? 0) * eventAgg._count +
        Number(hostAgg._avg.rating ?? 0) * hostAgg._count +
        Number(guestAgg._avg.rating ?? 0) * guestAgg._count) /
      (total || 1);
    return { total, averageRating: Math.round(weighted * 100) / 100 };
  }

  async reportCounts() {
    const [pending, underReview, resolved] = await Promise.all([
      prisma.report.count({ where: { deletedAt: null, status: 'PENDING' } }),
      prisma.report.count({ where: { deletedAt: null, status: 'UNDER_REVIEW' } }),
      prisma.report.count({ where: { deletedAt: null, status: 'RESOLVED' } }),
    ]);
    return { pending, underReview, resolved };
  }

  async topHosts(limit = 10) {
    return prisma.hostProfile.findMany({
      where: { deletedAt: null },
      orderBy: [{ totalGuests: 'desc' }, { hostRating: 'desc' }],
      take: limit,
      select: { id: true, displayName: true, slug: true, totalGuests: true, hostRating: true },
    });
  }

  async topEvents(limit = 10) {
    return prisma.event.findMany({
      where: { deletedAt: null, status: 'PUBLISHED' },
      orderBy: [{ remainingCapacity: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      select: { id: true, title: true, slug: true, capacity: true, remainingCapacity: true },
    });
  }

  async topCities(limit = 10) {
    const rows = await prisma.eventLocation.groupBy({
      by: ['city'],
      _count: { city: true },
      orderBy: { _count: { city: 'desc' } },
      take: limit,
    });
    return rows.map((r) => ({ city: r.city, count: r._count.city }));
  }

  async topCategories(limit = 10) {
    const rows = await prisma.event.groupBy({
      by: ['categoryId'],
      where: { deletedAt: null },
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: limit,
    });
    const categories = await prisma.category.findMany({
      where: { id: { in: rows.map((r) => r.categoryId) } },
      select: { id: true, name: true, slug: true },
    });
    const map = new Map(categories.map((c) => [c.id, c]));
    return rows.map((r) => ({
      category: map.get(r.categoryId),
      count: r._count.categoryId,
    }));
  }

  async timeSeriesUsers(range: DateRange) {
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: range.from, lte: range.to }, isDeleted: false },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return users;
  }

  async timeSeriesBookings(range: DateRange) {
    return prisma.eventBooking.findMany({
      where: { createdAt: { gte: range.from, lte: range.to }, deletedAt: null },
      select: { createdAt: true, bookingStatus: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async timeSeriesPayments(range: DateRange) {
    return prisma.payment.findMany({
      where: { createdAt: { gte: range.from, lte: range.to }, deletedAt: null, paymentStatus: 'CAPTURED' },
      select: { createdAt: true, amount: true, platformFee: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async retentionRate(range: DateRange) {
    const bookings = await prisma.eventBooking.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: range.from, lte: range.to }, deletedAt: null },
      _count: { userId: true },
    });
    const returning = bookings.filter((b) => b._count.userId > 1).length;
    const total = bookings.length;
    return { returningUsers: returning, rate: total ? Math.round((returning / total) * 10000) / 100 : 0 };
  }

  async trustDistribution() {
    const rows = await prisma.trustScore.groupBy({
      by: ['level'],
      _count: { level: true },
    });
    return rows.map((r) => ({ level: r.level, count: r._count.level }));
  }

  async exportRows(module: string, range: DateRange): Promise<Array<Record<string, string | number>>> {
    switch (module) {
      case 'users':
        return (
          await prisma.user.findMany({
            where: { createdAt: { gte: range.from, lte: range.to } },
            select: { id: true, email: true, accountStatus: true, createdAt: true },
          })
        ).map((u) => ({
          id: u.id,
          email: u.email,
          status: u.accountStatus,
          createdAt: u.createdAt.toISOString(),
        }));
      case 'hosts':
        return (
          await prisma.hostProfile.findMany({
            where: { createdAt: { gte: range.from, lte: range.to } },
            select: { id: true, displayName: true, slug: true, accountStatus: true, createdAt: true },
          })
        ).map((h) => ({
          id: h.id,
          displayName: h.displayName,
          slug: h.slug,
          status: h.accountStatus,
          createdAt: h.createdAt.toISOString(),
        }));
      case 'bookings':
        return (
          await prisma.eventBooking.findMany({
            where: { createdAt: { gte: range.from, lte: range.to } },
            select: { id: true, bookingReference: true, bookingStatus: true, ticketPrice: true, createdAt: true },
          })
        ).map((b) => ({
          id: b.id,
          reference: b.bookingReference,
          status: b.bookingStatus,
          amount: Number(b.ticketPrice),
          createdAt: b.createdAt.toISOString(),
        }));
      case 'payments':
      case 'revenue':
        return (
          await prisma.payment.findMany({
            where: { createdAt: { gte: range.from, lte: range.to }, paymentStatus: 'CAPTURED' },
            select: {
              id: true,
              paymentReference: true,
              amount: true,
              platformFee: true,
              netAmount: true,
              paidAt: true,
            },
          })
        ).map((p) => ({
          id: p.id,
          reference: p.paymentReference,
          amount: Number(p.amount),
          platformFee: Number(p.platformFee),
          netAmount: Number(p.netAmount),
          paidAt: p.paidAt?.toISOString() ?? '',
        }));
      case 'events':
        return (
          await prisma.event.findMany({
            where: { createdAt: { gte: range.from, lte: range.to } },
            select: { id: true, title: true, slug: true, status: true, price: true, createdAt: true },
          })
        ).map((e) => ({
          id: e.id,
          title: e.title,
          slug: e.slug,
          status: e.status,
          price: Number(e.price),
          createdAt: e.createdAt.toISOString(),
        }));
      case 'reports':
        return (
          await prisma.report.findMany({
            where: { createdAt: { gte: range.from, lte: range.to } },
            select: { id: true, reportType: true, category: true, status: true, createdAt: true },
          })
        ).map((r) => ({
          id: r.id,
          type: r.reportType,
          category: r.category,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        }));
      default:
        return [];
    }
  }
}

export const analyticsRepository = new AnalyticsRepository();

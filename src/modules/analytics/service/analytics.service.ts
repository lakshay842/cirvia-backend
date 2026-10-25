import { getRedisClient } from '@redis/index.js';
import { ANALYTICS_CONSTANTS } from '../constants/analytics.constants.js';
import { analyticsRepository } from '../repository/analytics.repository.js';
import type { AnalyticsPeriodQuery, ExportQuery } from '../schemas/analytics.schema.js';
import {
  growthPercent,
  resolveDateRange,
  type DashboardMetrics,
  type TimeSeriesPoint,
} from '../types/analytics.types.js';
import { buildTimeSeries, rowsToCsv } from '../utils/analytics.util.js';

export class AnalyticsService {
  private async getCached<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
    try {
      const redis = getRedisClient();
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as T;
      const data = await loader();
      await redis.setex(key, ttl, JSON.stringify(data));
      return data;
    } catch {
      return loader();
    }
  }

  async getDashboard(query: AnalyticsPeriodQuery): Promise<DashboardMetrics> {
    const key = ANALYTICS_CONSTANTS.REDIS_KEYS.dashboard(query.period);
    return this.getCached(key, ANALYTICS_CONSTANTS.REDIS_TTL.dashboard, () => this.buildDashboard(query));
  }

  private async buildDashboard(query: AnalyticsPeriodQuery): Promise<DashboardMetrics> {
    const range = resolveDateRange(query);
    const prevRange = {
      from: new Date(range.from.getTime() - (range.to.getTime() - range.from.getTime())),
      to: range.from,
    };

    const [
      users,
      prevUsers,
      hosts,
      prevHosts,
      events,
      liveEvents,
      bookings,
      confirmedBookings,
      _prevBookings,
      payments,
      wallet,
      withdrawals,
      reviews,
      reports,
      retention,
      topHosts,
      topEvents,
      topCities,
      topCategories,
      userSeriesRows,
      bookingSeriesRows,
      paymentSeriesRows,
    ] = await Promise.all([
      analyticsRepository.countUsers(range),
      analyticsRepository.countUsers(prevRange),
      analyticsRepository.countHosts(range),
      analyticsRepository.countHosts(prevRange),
      analyticsRepository.countEvents(range),
      analyticsRepository.countEvents(undefined, true),
      analyticsRepository.countBookings(range),
      analyticsRepository.countBookings(range, 'CONFIRMED'),
      analyticsRepository.countBookings(prevRange),
      analyticsRepository.paymentAggregates(range),
      analyticsRepository.walletAggregates(),
      analyticsRepository.withdrawalCounts(),
      analyticsRepository.reviewAggregates(),
      analyticsRepository.reportCounts(),
      analyticsRepository.retentionRate(range),
      analyticsRepository.topHosts(),
      analyticsRepository.topEvents(),
      analyticsRepository.topCities(),
      analyticsRepository.topCategories(),
      analyticsRepository.timeSeriesUsers(range),
      analyticsRepository.timeSeriesBookings(range),
      analyticsRepository.timeSeriesPayments(range),
    ]);

    const userSeries = buildTimeSeries(userSeriesRows, query.period);
    const bookingSeries = buildTimeSeries(bookingSeriesRows, query.period);
    const revenueSeries = buildTimeSeries(paymentSeriesRows, query.period, (p) => Number(p.amount));

    return {
      users: {
        total: users,
        growth: growthPercent(users, prevUsers),
        series: userSeries,
      },
      hosts: {
        total: hosts,
        growth: growthPercent(hosts, prevHosts),
        series: userSeries,
      },
      events: {
        total: events,
        live: liveEvents,
        series: bookingSeries,
      },
      bookings: {
        total: bookings,
        confirmed: confirmedBookings,
        conversionRate: bookings ? Math.round((confirmedBookings / bookings) * 10000) / 100 : 0,
        series: bookingSeries,
      },
      payments: {
        total: payments.count,
        succeeded: payments.succeeded,
        failed: payments.failed,
        series: revenueSeries,
      },
      revenue: {
        total: payments.totalAmount,
        platformFees: payments.platformFees,
        series: revenueSeries,
      },
      wallet: {
        totalBalance: wallet.availableBalance,
        pendingBalance: wallet.pendingBalance,
        lifetimeWithdrawals: wallet.lifetimeWithdrawals,
      },
      withdrawals,
      reviews,
      reports,
      retention,
      topHosts: topHosts.map((h) => ({
        id: h.id,
        name: h.displayName,
        value: h.totalGuests,
        metadata: { slug: h.slug, rating: Number(h.hostRating) },
      })),
      topEvents: topEvents.map((e) => ({
        id: e.id,
        name: e.title,
        value: e.capacity - e.remainingCapacity,
        metadata: { slug: e.slug, capacity: e.capacity },
      })),
      topCities: topCities.map((c) => ({ id: c.city, name: c.city, value: c.count })),
      topCategories: topCategories
        .filter((c) => c.category)
        .map((c) => ({
          id: c.category!.id,
          name: c.category!.name,
          value: c.count,
          metadata: { slug: c.category!.slug },
        })),
    };
  }

  async getRevenueAnalytics(query: AnalyticsPeriodQuery) {
    const key = ANALYTICS_CONSTANTS.REDIS_KEYS.revenue(query.period, query.from, query.to);
    return this.getCached(key, ANALYTICS_CONSTANTS.REDIS_TTL.metric, async () => {
      const range = resolveDateRange(query);
      const payments = await analyticsRepository.paymentAggregates(range);
      const series = buildTimeSeries(
        await analyticsRepository.timeSeriesPayments(range),
        query.period,
        (p) => Number(p.amount),
      );
      return { ...payments, series };
    });
  }

  async getUserGrowth(query: AnalyticsPeriodQuery) {
    const key = ANALYTICS_CONSTANTS.REDIS_KEYS.users(query.period);
    return this.getCached(key, ANALYTICS_CONSTANTS.REDIS_TTL.metric, async () => {
      const range = resolveDateRange(query);
      const total = await analyticsRepository.countUsers(range);
      const series = buildTimeSeries(await analyticsRepository.timeSeriesUsers(range), query.period);
      return { total, series };
    });
  }

  async getHostGrowth(query: AnalyticsPeriodQuery) {
    const key = ANALYTICS_CONSTANTS.REDIS_KEYS.hosts(query.period);
    return this.getCached(key, ANALYTICS_CONSTANTS.REDIS_TTL.metric, async () => {
      const range = resolveDateRange(query);
      const total = await analyticsRepository.countHosts(range);
      return { total, series: [] as TimeSeriesPoint[] };
    });
  }

  async getBookingAnalytics(query: AnalyticsPeriodQuery) {
    const key = ANALYTICS_CONSTANTS.REDIS_KEYS.bookings(query.period);
    return this.getCached(key, ANALYTICS_CONSTANTS.REDIS_TTL.metric, async () => {
      const range = resolveDateRange(query);
      const [total, confirmed, cancelled] = await Promise.all([
        analyticsRepository.countBookings(range),
        analyticsRepository.countBookings(range, 'CONFIRMED'),
        analyticsRepository.countBookings(range, 'CANCELLED'),
      ]);
      const series = buildTimeSeries(await analyticsRepository.timeSeriesBookings(range), query.period);
      return { total, confirmed, cancelled, series };
    });
  }

  async getEventAnalytics(query: AnalyticsPeriodQuery) {
    const key = ANALYTICS_CONSTANTS.REDIS_KEYS.events(query.period);
    return this.getCached(key, ANALYTICS_CONSTANTS.REDIS_TTL.metric, async () => {
      const range = resolveDateRange(query);
      const [total, live, topEvents, topCategories, topCities] = await Promise.all([
        analyticsRepository.countEvents(range),
        analyticsRepository.countEvents(undefined, true),
        analyticsRepository.topEvents(),
        analyticsRepository.topCategories(),
        analyticsRepository.topCities(),
      ]);
      return { total, live, topEvents, topCategories, topCities };
    });
  }

  async getTrustAnalytics(query: AnalyticsPeriodQuery) {
    const key = ANALYTICS_CONSTANTS.REDIS_KEYS.trust(query.period);
    return this.getCached(key, ANALYTICS_CONSTANTS.REDIS_TTL.metric, async () => {
      const distribution = await analyticsRepository.trustDistribution();
      return { distribution };
    });
  }

  async getReportAnalytics(query: AnalyticsPeriodQuery) {
    const key = ANALYTICS_CONSTANTS.REDIS_KEYS.reports(query.period);
    return this.getCached(key, ANALYTICS_CONSTANTS.REDIS_TTL.metric, async () => {
      const counts = await analyticsRepository.reportCounts();
      return counts;
    });
  }

  async exportCsv(query: ExportQuery) {
    const range = resolveDateRange({
      period: 'monthly',
      ...(query.from && { from: new Date(query.from).toISOString() }),
      ...(query.to && { to: new Date(query.to).toISOString() }),
    });

    const cacheKey = ANALYTICS_CONSTANTS.REDIS_KEYS.export(query.module, range.from.toISOString(), range.to.toISOString());

    return this.getCached(cacheKey, ANALYTICS_CONSTANTS.REDIS_TTL.export, async () => {
      const rows = await analyticsRepository.exportRows(query.module, range);
      if (query.format !== 'csv') {
        return { format: query.format, rows, message: 'Only CSV export is fully supported in v1.' };
      }
      return {
        format: 'csv',
        filename: `${query.module}-${range.from.toISOString().slice(0, 10)}-${range.to.toISOString().slice(0, 10)}.csv`,
        content: rowsToCsv(rows),
        rowCount: rows.length,
      };
    });
  }
}

export const analyticsService = new AnalyticsService();

import type { AnalyticsPeriodQuery } from '../schemas/analytics.schema.js';

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface TopEntity {
  id: string;
  name: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface DashboardMetrics {
  users: { total: number; growth: number; series: TimeSeriesPoint[] };
  hosts: { total: number; growth: number; series: TimeSeriesPoint[] };
  events: { total: number; live: number; series: TimeSeriesPoint[] };
  bookings: { total: number; confirmed: number; conversionRate: number; series: TimeSeriesPoint[] };
  payments: { total: number; succeeded: number; failed: number; series: TimeSeriesPoint[] };
  revenue: { total: number; platformFees: number; series: TimeSeriesPoint[] };
  wallet: { totalBalance: number; pendingBalance: number; lifetimeWithdrawals: number };
  withdrawals: { pending: number; completed: number; rejected: number };
  reviews: { total: number; averageRating: number };
  reports: { pending: number; underReview: number; resolved: number };
  retention: { rate: number; returningUsers: number };
  topHosts: TopEntity[];
  topEvents: TopEntity[];
  topCities: TopEntity[];
  topCategories: TopEntity[];
}

export interface DateRange {
  from: Date;
  to: Date;
}

export function resolveDateRange(query: AnalyticsPeriodQuery): DateRange {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to);

  if (!query.from) {
    switch (query.period) {
      case 'daily':
        from.setDate(to.getDate() - 1);
        break;
      case 'weekly':
        from.setDate(to.getDate() - 7);
        break;
      case 'monthly':
        from.setMonth(to.getMonth() - 1);
        break;
      case 'yearly':
        from.setFullYear(to.getFullYear() - 1);
        break;
    }
  }

  return { from, to };
}

export function bucketLabel(date: Date, period: AnalyticsPeriodQuery['period']): string {
  if (period === 'yearly') return `${date.getFullYear()}`;
  if (period === 'monthly') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return date.toISOString().slice(0, 10);
}

export function growthPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

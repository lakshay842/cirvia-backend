import { REDIS_CACHE_POLICY } from '@shared/cache/redis-cache-policy.js';

export const ANALYTICS_CONSTANTS = {
  QUEUE_NAME: 'analytics',
  JOB_TYPES: {
    AGGREGATE_DAILY: 'aggregate_daily',
    AGGREGATE_MONTHLY: 'aggregate_monthly',
    INVALIDATE_CACHE: 'invalidate_cache',
  },
  PERIODS: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
  } as const,
  REDIS_KEYS: {
    dashboard: (period: string) => `cache:analytics:dashboard:${period}`,
    revenue: (period: string, from?: string, to?: string) =>
      `cache:analytics:revenue:${period}:${from ?? 'all'}:${to ?? 'all'}`,
    users: (period: string) => `cache:analytics:users:${period}`,
    hosts: (period: string) => `cache:analytics:hosts:${period}`,
    bookings: (period: string) => `cache:analytics:bookings:${period}`,
    events: (period: string) => `cache:analytics:events:${period}`,
    trust: (period: string) => `cache:analytics:trust:${period}`,
    reports: (period: string) => `cache:analytics:reports:${period}`,
    export: (module: string, from: string, to: string) => `cache:analytics:export:${module}:${from}:${to}`,
  },
  REDIS_TTL: {
    dashboard: REDIS_CACHE_POLICY.TTL.MEDIUM,
    metric: REDIS_CACHE_POLICY.TTL.MEDIUM,
    export: REDIS_CACHE_POLICY.TTL.LONG,
  },
  EXPORT_MODULES: ['users', 'hosts', 'bookings', 'payments', 'revenue', 'events', 'reports'] as const,
} as const;

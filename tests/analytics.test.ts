import { describe, it, expect } from 'vitest';
import {
  analyticsPeriodQuerySchema,
  exportQuerySchema,
} from '../src/modules/analytics/schemas/analytics.schema.js';
import { ANALYTICS_CONSTANTS } from '../src/modules/analytics/constants/analytics.constants.js';
import { buildTimeSeries, rowsToCsv } from '../src/modules/analytics/utils/analytics.util.js';
import { growthPercent, resolveDateRange, bucketLabel } from '../src/modules/analytics/types/analytics.types.js';

describe('Analytics schemas', () => {
  it('validates period query defaults', () => {
    const parsed = analyticsPeriodQuerySchema.parse({});
    expect(parsed.period).toBe('monthly');
  });

  it('validates export query', () => {
    expect(exportQuerySchema.safeParse({ module: 'bookings', format: 'csv' }).success).toBe(true);
    expect(exportQuerySchema.safeParse({ module: 'invalid' }).success).toBe(false);
  });
});

describe('Analytics utilities', () => {
  it('resolves date range for monthly period', () => {
    const range = resolveDateRange({ period: 'monthly' });
    expect(range.to.getTime()).toBeGreaterThan(range.from.getTime());
  });

  it('builds time series buckets', () => {
    const rows = [
      { createdAt: new Date('2025-06-01T10:00:00Z') },
      { createdAt: new Date('2025-06-01T12:00:00Z') },
      { createdAt: new Date('2025-06-02T10:00:00Z') },
    ];
    const series = buildTimeSeries(rows, 'daily');
    expect(series).toHaveLength(2);
    expect(series[0]?.value).toBe(2);
  });

  it('calculates growth percent', () => {
    expect(growthPercent(120, 100)).toBe(20);
    expect(growthPercent(10, 0)).toBe(100);
  });

  it('formats bucket labels', () => {
    const date = new Date('2025-06-15T00:00:00Z');
    expect(bucketLabel(date, 'daily')).toBe('2025-06-15');
    expect(bucketLabel(date, 'yearly')).toBe('2025');
  });

  it('converts rows to CSV', () => {
    const csv = rowsToCsv([
      { id: '1', name: 'Test' },
      { id: '2', name: 'Other' },
    ]);
    expect(csv.split('\n')).toHaveLength(3);
    expect(csv).toContain('"Test"');
  });

  it('defines analytics constants', () => {
    expect(ANALYTICS_CONSTANTS.EXPORT_MODULES).toContain('revenue');
    expect(ANALYTICS_CONSTANTS.REDIS_KEYS.dashboard('monthly')).toBe('cache:analytics:dashboard:monthly');
  });
});

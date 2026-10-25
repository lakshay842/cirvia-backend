import type { AnalyticsPeriodQuery } from '../schemas/analytics.schema.js';
import { bucketLabel } from '../types/analytics.types.js';

export function buildTimeSeries<T extends { createdAt: Date }>(
  rows: T[],
  period: AnalyticsPeriodQuery['period'],
  valueFn: (row: T) => number = () => 1,
): Array<{ date: string; value: number }> {
  const buckets = new Map<string, number>();
  for (const row of rows) {
    const key = bucketLabel(row.createdAt, period);
    buckets.set(key, (buckets.get(key) ?? 0) + valueFn(row));
  }
  return Array.from(buckets.entries()).map(([date, value]) => ({ date, value }));
}

export function rowsToCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
  }
  return lines.join('\n');
}

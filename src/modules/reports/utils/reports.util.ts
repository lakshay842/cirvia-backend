import type { ReportCategory, ReportPriority, ReportStatus, ReportType, ReviewType } from '@prisma/client';
import { REPORTS_CONSTANTS } from '../constants/reports.constants.js';

const categoryMap: Record<string, ReportCategory> = {
  spam: 'SPAM',
  harassment: 'HARASSMENT',
  violence: 'VIOLENCE',
  'fake profile': 'FAKE_PROFILE',
  fake_profile: 'FAKE_PROFILE',
  scam: 'SCAM',
  nsfw: 'NSFW',
  other: 'OTHER',
};

export function mapReportCategory(input: string): ReportCategory {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, ' ');
  const key = normalized.replace(/ /g, '_');
  const mapped =
    categoryMap[normalized] ??
    categoryMap[key] ??
    (Object.keys(REPORTS_CONSTANTS.CATEGORIES).find(
      (k) => REPORTS_CONSTANTS.CATEGORIES[k as keyof typeof REPORTS_CONSTANTS.CATEGORIES].toLowerCase() === normalized,
    ) as ReportCategory | undefined);
  if (!mapped) {
    return 'OTHER';
  }
  return mapped;
}

export function mapReportStatus(input?: string): ReportStatus | undefined {
  if (!input || input === 'all') return undefined;
  const map: Record<string, ReportStatus> = {
    pending: 'PENDING',
    under_review: 'UNDER_REVIEW',
    resolved: 'RESOLVED',
    rejected: 'REJECTED',
    closed: 'CLOSED',
    dismissed: 'REJECTED',
  };
  return map[input];
}

export function mapReportType(input: string): ReportType {
  const map: Record<string, ReportType> = {
    user: 'USER',
    host: 'HOST',
    event: 'EVENT',
    review: 'REVIEW',
    booking: 'BOOKING',
  };
  const value = map[input.toLowerCase()];
  if (!value) throw new Error(`Invalid report type: ${input}`);
  return value;
}

export function mapReportPriority(input?: string): ReportPriority | undefined {
  if (!input || input === 'all') return undefined;
  const map: Record<string, ReportPriority> = {
    low: 'LOW',
    medium: 'MEDIUM',
    high: 'HIGH',
    urgent: 'URGENT',
  };
  return map[input];
}

export function toReportTypeSlug(type: ReportType): string {
  return type.toLowerCase();
}

export function toReviewType(type: 'event' | 'host' | 'guest'): ReviewType {
  return type.toUpperCase() as ReviewType;
}

export function listQueryCacheHash(query: Record<string, string | number | undefined>): string {
  return Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
}

export function categoryLabel(category: ReportCategory): string {
  const labels: Record<ReportCategory, string> = {
    SPAM: 'Spam',
    HARASSMENT: 'Harassment',
    VIOLENCE: 'Violence',
    FAKE_PROFILE: 'Fake Profile',
    SCAM: 'Scam',
    NSFW: 'NSFW',
    OTHER: 'Other',
  };
  return labels[category];
}

export function statusLabel(status: ReportStatus): string {
  const labels: Record<ReportStatus, string> = {
    PENDING: 'Pending',
    UNDER_REVIEW: 'Under Review',
    RESOLVED: 'Resolved',
    REJECTED: 'Rejected',
    CLOSED: 'Closed',
  };
  return labels[status];
}

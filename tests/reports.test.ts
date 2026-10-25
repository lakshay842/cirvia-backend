import { describe, it, expect } from 'vitest';
import {
  reportUserSchema,
  reportHostSchema,
  reportEventSchema,
  reportBookingSchema,
  reportReviewSchema,
  myReportsQuerySchema,
  adminReportsQuerySchema,
  assignModeratorSchema,
  investigationNoteSchema,
  resolveReportSchema,
  dismissReportSchema,
} from '../src/modules/reports/schemas/reports.schema.js';
import { REPORTS_CONSTANTS } from '../src/modules/reports/constants/reports.constants.js';
import {
  mapReportCategory,
  mapReportStatus,
  mapReportType,
  categoryLabel,
  statusLabel,
  listQueryCacheHash,
} from '../src/modules/reports/utils/reports.util.js';

describe('Reports schemas', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  it('validates report user body', () => {
    expect(reportUserSchema.safeParse({ userId, reason: 'Spam', description: 'Abuse' }).success).toBe(true);
  });

  it('validates report host body', () => {
    expect(reportHostSchema.safeParse({ hostId: userId, reason: 'Scam' }).success).toBe(true);
  });

  it('validates report event body', () => {
    expect(reportEventSchema.safeParse({ eventId: userId, reason: 'Violence' }).success).toBe(true);
  });

  it('validates report booking body', () => {
    expect(reportBookingSchema.safeParse({ bookingId: userId, reason: 'Harassment' }).success).toBe(true);
  });

  it('validates report review body', () => {
    expect(
      reportReviewSchema.safeParse({
        reviewId: userId,
        type: 'event',
        reason: 'NSFW',
      }).success,
    ).toBe(true);
  });

  it('validates admin list query defaults', () => {
    const parsed = adminReportsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.status).toBe('all');
  });

  it('validates assign moderator body', () => {
    expect(assignModeratorSchema.safeParse({ moderatorId: userId, note: 'Take this case' }).success).toBe(true);
  });

  it('validates investigation note body', () => {
    expect(investigationNoteSchema.safeParse({ note: 'Checked chat logs' }).success).toBe(true);
  });

  it('validates resolve and dismiss bodies', () => {
    expect(resolveReportSchema.safeParse({ resolution: 'Warned user', action: 'warning' }).success).toBe(true);
    expect(dismissReportSchema.safeParse({ reason: 'No policy violation' }).success).toBe(true);
  });

  it('validates my reports query', () => {
    const parsed = myReportsQuerySchema.parse({ page: 2 });
    expect(parsed.page).toBe(2);
    expect(parsed.type).toBe('all');
  });
});

describe('Reports utilities', () => {
  it('maps categories from labels', () => {
    expect(mapReportCategory('Fake Profile')).toBe('FAKE_PROFILE');
    expect(mapReportCategory('violence')).toBe('VIOLENCE');
    expect(mapReportCategory('NSFW')).toBe('NSFW');
  });

  it('maps statuses', () => {
    expect(mapReportStatus('under_review')).toBe('UNDER_REVIEW');
    expect(mapReportStatus('rejected')).toBe('REJECTED');
    expect(mapReportStatus('all')).toBeUndefined();
  });

  it('maps report types', () => {
    expect(mapReportType('booking')).toBe('BOOKING');
  });

  it('formats labels', () => {
    expect(categoryLabel('SCAM')).toBe('Scam');
    expect(statusLabel('CLOSED')).toBe('Closed');
  });

  it('builds cache hash', () => {
    expect(listQueryCacheHash({ page: 1, status: 'pending' })).toBe('page:1|status:pending');
  });

  it('defines constants', () => {
    expect(REPORTS_CONSTANTS.MAX_ATTACHMENTS).toBe(5);
    expect(REPORTS_CONSTANTS.CATEGORIES.VIOLENCE).toBe('Violence');
    expect(REPORTS_CONSTANTS.STATUSES.REJECTED).toBe('rejected');
  });
});

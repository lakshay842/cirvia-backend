import { REDIS_CACHE_POLICY } from '@shared/cache/redis-cache-policy.js';

export const REPORTS_CONSTANTS = {
  QUEUE_NAME: 'reports',
  MAX_ATTACHMENTS: 5,
  MAX_ATTACHMENT_SIZE_BYTES: 5 * 1024 * 1024,
  JOB_TYPES: {
    NOTIFY_REPORTER: 'notify_reporter',
    NOTIFY_ASSIGNEE: 'notify_assignee',
    RECALC_TRUST: 'recalc_trust',
  },
  REPORT_TYPES: {
    USER: 'user',
    HOST: 'host',
    EVENT: 'event',
    REVIEW: 'review',
    BOOKING: 'booking',
  } as const,
  CATEGORIES: {
    SPAM: 'Spam',
    HARASSMENT: 'Harassment',
    VIOLENCE: 'Violence',
    FAKE_PROFILE: 'Fake Profile',
    SCAM: 'Scam',
    NSFW: 'NSFW',
    OTHER: 'Other',
  } as const,
  STATUSES: {
    PENDING: 'pending',
    UNDER_REVIEW: 'under_review',
    RESOLVED: 'resolved',
    REJECTED: 'rejected',
    CLOSED: 'closed',
  } as const,
  REDIS_KEYS: {
    adminQueue: (hash: string) => `cache:reports:admin:queue:${hash}`,
    detail: (reportId: string) => `cache:reports:detail:${reportId}`,
    myReports: (userId: string, hash: string) => `cache:reports:mine:${userId}:${hash}`,
  },
  REDIS_TTL: {
    queue: REDIS_CACHE_POLICY.TTL.SHORT,
    detail: REDIS_CACHE_POLICY.TTL.MEDIUM,
    list: REDIS_CACHE_POLICY.TTL.SHORT,
  },
  AUDIT_ACTIONS: {
    SUBMITTED: 'report.submitted',
    ASSIGNED: 'report.assigned',
    NOTE_ADDED: 'report.note_added',
    ATTACHMENT_ADDED: 'report.attachment_added',
    STATUS_CHANGED: 'report.status_changed',
    RESOLVED: 'report.resolved',
    DISMISSED: 'report.dismissed',
    CLOSED: 'report.closed',
  },
  ERROR_CODES: {
    REPORT_NOT_FOUND: 'REPORT_NOT_FOUND',
    DUPLICATE_REPORT: 'DUPLICATE_REPORT',
    SELF_REPORT: 'SELF_REPORT',
    TARGET_NOT_FOUND: 'TARGET_NOT_FOUND',
    INVALID_STATUS: 'INVALID_STATUS',
    UNAUTHORIZED: 'UNAUTHORIZED_ACTION',
    MAX_ATTACHMENTS: 'MAX_ATTACHMENTS_REACHED',
  },
} as const;

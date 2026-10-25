import { REDIS_CACHE_POLICY } from '@shared/cache/redis-cache-policy.js';

export const REVIEWS_CONSTANTS = {
  QUEUE_NAME: 'reviews',
  RATING_MIN: 1,
  RATING_MAX: 5,
  EDIT_WINDOW_HOURS: 24,
  MAX_MEDIA_PER_REVIEW: 5,
  JOB_TYPES: {
    RECALC_TRUST_SCORE: 'recalc_trust_score',
    RECALC_HOST_RATING: 'recalc_host_rating',
    RECALC_EVENT_STATS: 'recalc_event_stats',
  },
  REVIEW_TYPES: {
    EVENT: 'event',
    HOST: 'host',
    GUEST: 'guest',
  } as const,
  MODERATION: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    HIDDEN: 'HIDDEN',
  },
  REDIS_KEYS: {
    eventStats: (eventId: string) => `cache:reviews:event:stats:${eventId}`,
    hostStats: (hostId: string) => `cache:reviews:host:stats:${hostId}`,
    eventList: (eventId: string, hash: string) => `cache:reviews:event:list:${eventId}:${hash}`,
    hostList: (hostId: string, hash: string) => `cache:reviews:host:list:${hostId}:${hash}`,
  },
  REDIS_TTL: {
    stats: REDIS_CACHE_POLICY.TTL.MEDIUM,
    list: REDIS_CACHE_POLICY.TTL.SHORT,
  },
  AUDIT_ACTIONS: {
    SUBMITTED: 'review.submitted',
    UPDATED: 'review.updated',
    DELETED: 'review.deleted',
    REPLIED: 'review.replied',
    VOTED: 'review.voted',
    REPORTED: 'review.reported',
    MODERATED: 'review.moderated',
  },
  ERROR_CODES: {
    REVIEW_ALREADY_EXISTS: 'REVIEW_ALREADY_EXISTS',
    BOOKING_NOT_COMPLETED: 'BOOKING_NOT_COMPLETED',
    INVALID_RATING: 'INVALID_RATING',
    REVIEW_NOT_FOUND: 'REVIEW_NOT_FOUND',
    REVIEW_EDIT_WINDOW_EXPIRED: 'REVIEW_EDIT_WINDOW_EXPIRED',
    REPORT_ALREADY_SUBMITTED: 'REPORT_ALREADY_SUBMITTED',
    REPLY_ALREADY_EXISTS: 'REPLY_ALREADY_EXISTS',
    UNAUTHORIZED_ACTION: 'UNAUTHORIZED_ACTION',
  },
} as const;

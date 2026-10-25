import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VERIFICATION_CONSTANTS } from '../../src/modules/verification/constants/verification.constants.js';

vi.mock('@config/index.js', () => ({
  getConfig: () => ({ REDIS_URL: 'redis://localhost:6379', NODE_ENV: 'test' }),
}));

vi.mock('@redis/index.js', () => ({
  getRedisClient: () => ({ options: {}, call: vi.fn() }),
}));

describe('Booking queue', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exports scheduleBookingExpiry function', async () => {
    const mod = await import('../../src/modules/bookings/events/bookings.queue.js');
    expect(typeof mod.scheduleBookingExpiry).toBe('function');
    expect(typeof mod.startBookingWorker).toBe('function');
    expect(typeof mod.closeBookingQueue).toBe('function');
  });

  it('skips scheduling in test environment gracefully', async () => {
    const { scheduleBookingExpiry } = await import(
      '../../src/modules/bookings/events/bookings.queue.js'
    );
    await expect(
      scheduleBookingExpiry('550e8400-e29b-41d4-a716-446655440000', new Date(Date.now() + 60_000)),
    ).resolves.toBeUndefined();
  });
});

describe('Payment queue', () => {
  it('exports payment queue functions', async () => {
    const mod = await import('../../src/modules/payments/events/payments.queue.js');
    expect(typeof mod.enqueuePaymentJob).toBe('function');
    expect(typeof mod.startPaymentWorker).toBe('function');
    expect(typeof mod.closePaymentQueue).toBe('function');
  });

  it('skips enqueue in test environment', async () => {
    const { enqueuePaymentJob } = await import(
      '../../src/modules/payments/events/payments.queue.js'
    );
    const { PAYMENTS_CONSTANTS } = await import(
      '../../src/modules/payments/constants/payments.constants.js'
    );
    await expect(
      enqueuePaymentJob('550e8400-e29b-41d4-a716-446655440000', PAYMENTS_CONSTANTS.JOB_TYPES.SCHEDULE_SETTLEMENT),
    ).resolves.toBeUndefined();
  });
});

describe('Wallet queue', () => {
  it('exports wallet queue functions', async () => {
    const mod = await import('../../src/modules/wallet/events/wallet.queue.js');
    expect(typeof mod.enqueueWalletJob).toBe('function');
    expect(typeof mod.startWalletWorker).toBe('function');
    expect(typeof mod.closeWalletQueue).toBe('function');
  });

  it('skips enqueue in test environment', async () => {
    const { enqueueWalletJob } = await import('../../src/modules/wallet/events/wallet.queue.js');
    const { WALLET_CONSTANTS } = await import('../../src/modules/wallet/constants/wallet.constants.js');
    await expect(
      enqueueWalletJob('550e8400-e29b-41d4-a716-446655440000', WALLET_CONSTANTS.JOB_TYPES.SETTLE_PAYMENT),
    ).resolves.toBeUndefined();
  });
});

describe('Verification queue', () => {
  it('exports enqueue and worker functions', async () => {
    const mod = await import('../../src/modules/verification/events/verification.queue.js');
    expect(typeof mod.enqueueVerificationJob).toBe('function');
    expect(typeof mod.startVerificationWorker).toBe('function');
    expect(typeof mod.closeVerificationQueue).toBe('function');
  });

  it('skips enqueue in test environment', async () => {
    const { enqueueVerificationJob } = await import(
      '../../src/modules/verification/events/verification.queue.js'
    );
    await expect(
      enqueueVerificationJob({
        verificationId: '550e8400-e29b-41d4-a716-446655440000',
        userId: '660e8400-e29b-41d4-a716-446655440001',
        jobType: VERIFICATION_CONSTANTS.JOB_TYPES.OCR_PROCESSING,
      }),
    ).resolves.toBeUndefined();
  });
});

describe('Notification queue', () => {
  it('exports notification queue functions', async () => {
    const mod = await import('../../src/modules/notifications/events/notifications.queue.js');
    expect(typeof mod.enqueueNotificationJob).toBe('function');
    expect(typeof mod.startNotificationWorker).toBe('function');
    expect(typeof mod.closeNotificationQueue).toBe('function');
  });

  it('skips enqueue in test environment', async () => {
    const { enqueueNotificationJob } = await import(
      '../../src/modules/notifications/events/notifications.queue.js'
    );
    const { NOTIFICATIONS_CONSTANTS } = await import(
      '../../src/modules/notifications/constants/notifications.constants.js'
    );
    await expect(
      enqueueNotificationJob(NOTIFICATIONS_CONSTANTS.JOB_TYPES.DISPATCH, {
        trigger: NOTIFICATIONS_CONSTANTS.TRIGGERS.BOOKING_CREATED,
        payload: { bookingId: '550e8400-e29b-41d4-a716-446655440000' },
      }),
    ).resolves.toBeUndefined();
  });
});

describe('Review queue', () => {
  it('exports review queue functions', async () => {
    const mod = await import('../../src/modules/reviews/events/reviews.queue.js');
    expect(typeof mod.enqueueReviewJob).toBe('function');
    expect(typeof mod.startReviewWorker).toBe('function');
    expect(typeof mod.closeReviewQueue).toBe('function');
  });

  it('skips enqueue in test environment', async () => {
    const { enqueueReviewJob } = await import('../../src/modules/reviews/events/reviews.queue.js');
    const { REVIEWS_CONSTANTS } = await import('../../src/modules/reviews/constants/reviews.constants.js');
    await expect(
      enqueueReviewJob(REVIEWS_CONSTANTS.JOB_TYPES.RECALC_HOST_RATING, {
        hostId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('Report queue', () => {
  it('exports report queue functions', async () => {
    const mod = await import('../../src/modules/reports/events/reports.queue.js');
    expect(typeof mod.enqueueReportJob).toBe('function');
    expect(typeof mod.startReportWorker).toBe('function');
    expect(typeof mod.closeReportQueue).toBe('function');
  });

  it('skips enqueue in test environment', async () => {
    const { enqueueReportJob } = await import('../../src/modules/reports/events/reports.queue.js');
    const { REPORTS_CONSTANTS } = await import('../../src/modules/reports/constants/reports.constants.js');
    await expect(
      enqueueReportJob(REPORTS_CONSTANTS.JOB_TYPES.NOTIFY_REPORTER, {
        reportId: '550e8400-e29b-41d4-a716-446655440000',
        userId: '660e8400-e29b-41d4-a716-446655440001',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('Analytics queue', () => {
  it('exports analytics queue functions', async () => {
    const mod = await import('../../src/modules/analytics/events/analytics.queue.js');
    expect(typeof mod.enqueueAnalyticsJob).toBe('function');
    expect(typeof mod.startAnalyticsWorker).toBe('function');
    expect(typeof mod.closeAnalyticsQueue).toBe('function');
  });

  it('skips enqueue in test environment', async () => {
    const { enqueueAnalyticsJob } = await import('../../src/modules/analytics/events/analytics.queue.js');
    const { ANALYTICS_CONSTANTS } = await import('../../src/modules/analytics/constants/analytics.constants.js');
    await expect(
      enqueueAnalyticsJob(ANALYTICS_CONSTANTS.JOB_TYPES.AGGREGATE_DAILY, { date: '2025-06-26' }),
    ).resolves.toBeUndefined();
  });
});

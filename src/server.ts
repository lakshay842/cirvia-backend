import { createApp } from './app.js';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';
import { connectDatabase, disconnectDatabase } from '@database/index.js';
import { connectRedis, disconnectRedis } from '@redis/index.js';
import { startBookingWorker, closeBookingQueue } from './modules/bookings/events/bookings.queue.js';
import {
  startVerificationWorker,
  closeVerificationQueue,
} from './modules/verification/events/verification.queue.js';
import { startPaymentWorker, closePaymentQueue } from './modules/payments/events/payments.queue.js';
import { startWalletWorker, closeWalletQueue } from './modules/wallet/events/wallet.queue.js';
import {
  startNotificationWorker,
  closeNotificationQueue,
} from './modules/notifications/events/notifications.queue.js';
import { startReviewWorker, closeReviewQueue } from './modules/reviews/events/reviews.queue.js';
import { startReportWorker, closeReportQueue } from './modules/reports/events/reports.queue.js';
import { startAnalyticsWorker, closeAnalyticsQueue } from './modules/analytics/events/analytics.queue.js';

const logger = getLogger();

async function bootstrap(): Promise<void> {
  const config = getConfig();

  logger.info({ env: config.NODE_ENV, version: config.APP_VERSION }, 'Starting Cirvia API');

  await connectDatabase();
  await connectRedis();

  try {
    startBookingWorker();
    logger.info('Booking expiry worker started');
  } catch (error) {
    logger.warn({ err: error }, 'Booking worker failed to start — expiry jobs disabled');
  }

  try {
    startVerificationWorker();
    logger.info('Verification worker started');
  } catch (error) {
    logger.warn({ err: error }, 'Verification worker failed to start — async KYC jobs disabled');
  }

  try {
    startPaymentWorker();
    logger.info('Payment worker started');
  } catch (error) {
    logger.warn({ err: error }, 'Payment worker failed to start — settlement jobs disabled');
  }

  try {
    startWalletWorker();
    logger.info('Wallet worker started');
  } catch (error) {
    logger.warn({ err: error }, 'Wallet worker failed to start — settlement queue disabled');
  }

  try {
    startNotificationWorker();
    logger.info('Notification worker started');
  } catch (error) {
    logger.warn({ err: error }, 'Notification worker failed to start — dispatch jobs disabled');
  }

  try {
    startReviewWorker();
    logger.info('Review worker started');
  } catch (error) {
    logger.warn({ err: error }, 'Review worker failed to start — rating recalc jobs disabled');
  }

  try {
    startReportWorker();
    logger.info('Report worker started');
  } catch (error) {
    logger.warn({ err: error }, 'Report worker failed to start — report jobs disabled');
  }

  try {
    startAnalyticsWorker();
    logger.info('Analytics worker started');
  } catch (error) {
    logger.warn({ err: error }, 'Analytics worker failed to start — aggregation jobs disabled');
  }

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'Cirvia API server listening');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');

    server.close(async () => {
      try {
        await closeBookingQueue();
        await closeVerificationQueue();
        await closePaymentQueue();
        await closeWalletQueue();
        await closeNotificationQueue();
        await closeReviewQueue();
        await closeReportQueue();
        await closeAnalyticsQueue();
        await disconnectRedis();
        await disconnectDatabase();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error({ err: error }, 'Error during shutdown');
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start application');
  process.exit(1);
});

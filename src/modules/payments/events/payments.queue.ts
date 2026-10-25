import { Queue, Worker, type Job } from 'bullmq';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';
import { getRedisClient } from '@redis/index.js';
import { PAYMENTS_CONSTANTS } from '../constants/payments.constants.js';

const logger = getLogger();

export interface PaymentJobData {
  paymentId: string;
  jobType: (typeof PAYMENTS_CONSTANTS.JOB_TYPES)[keyof typeof PAYMENTS_CONSTANTS.JOB_TYPES];
  payload?: Record<string, unknown>;
}

let paymentQueue: Queue<PaymentJobData> | null = null;
let paymentWorker: Worker<PaymentJobData> | null = null;

function getConnection() {
  const config = getConfig();
  const redis = getRedisClient();
  return {
    host: new URL(config.REDIS_URL).hostname,
    port: Number(new URL(config.REDIS_URL).port || 6379),
    ...(redis.options.password ? { password: redis.options.password } : {}),
  };
}

export function getPaymentQueue(): Queue<PaymentJobData> {
  if (!paymentQueue) {
    paymentQueue = new Queue<PaymentJobData>(PAYMENTS_CONSTANTS.QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }
  return paymentQueue;
}

export async function enqueuePaymentJob(
  paymentId: string,
  jobType: PaymentJobData['jobType'],
  payload?: Record<string, unknown>,
): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    logger.debug({ paymentId, jobType }, 'Payment job skipped in test environment');
    return;
  }

  try {
    const queue = getPaymentQueue();
    await queue.add(jobType, { paymentId, jobType, ...(payload && { payload }) }, {
      jobId: `${jobType}-${paymentId}-${Date.now()}`,
    });
  } catch (error) {
    logger.warn({ paymentId, jobType, err: error }, 'Failed to enqueue payment job');
  }
}

async function processPaymentJob(job: Job<PaymentJobData>): Promise<void> {
  const { paymentId, jobType, payload } = job.data;
  logger.info({ paymentId, jobType }, 'Processing payment job');

  switch (jobType) {
    case PAYMENTS_CONSTANTS.JOB_TYPES.SCHEDULE_SETTLEMENT: {
      const { walletService } = await import('../../wallet/service/wallet.service.js');
      if (paymentId) {
        await walletService.settlePayment(paymentId);
      } else {
        await walletService.processSettlementBatch();
      }
      break;
    }
    case PAYMENTS_CONSTANTS.JOB_TYPES.PROCESS_WEBHOOK:
    case PAYMENTS_CONSTANTS.JOB_TYPES.RETRY_WEBHOOK:
      logger.info({ paymentId, payload }, 'Webhook retry job stub');
      break;
    default:
      logger.warn({ jobType }, 'Unknown payment job type');
  }
}

export function startPaymentWorker(): Worker<PaymentJobData> {
  if (!paymentWorker) {
    paymentWorker = new Worker<PaymentJobData>(
      PAYMENTS_CONSTANTS.QUEUE_NAME,
      processPaymentJob,
      { connection: getConnection() },
    );
    paymentWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'Payment job failed');
    });
  }
  return paymentWorker;
}

export async function closePaymentQueue(): Promise<void> {
  if (paymentWorker) {
    await paymentWorker.close();
    paymentWorker = null;
  }
  if (paymentQueue) {
    await paymentQueue.close();
    paymentQueue = null;
  }
}

import { Queue, Worker, type Job } from 'bullmq';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';
import { getRedisClient } from '@redis/index.js';
import { WALLET_CONSTANTS } from '../constants/wallet.constants.js';

const logger = getLogger();

export interface WalletJobData {
  paymentId?: string;
  jobType: (typeof WALLET_CONSTANTS.JOB_TYPES)[keyof typeof WALLET_CONSTANTS.JOB_TYPES];
  payload?: Record<string, unknown>;
}

let walletQueue: Queue<WalletJobData> | null = null;
let walletWorker: Worker<WalletJobData> | null = null;

function getConnection() {
  const config = getConfig();
  const redis = getRedisClient();
  return {
    host: new URL(config.REDIS_URL).hostname,
    port: Number(new URL(config.REDIS_URL).port || 6379),
    ...(redis.options.password ? { password: redis.options.password } : {}),
  };
}

export function getWalletQueue(): Queue<WalletJobData> {
  if (!walletQueue) {
    walletQueue = new Queue<WalletJobData>(WALLET_CONSTANTS.QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }
  return walletQueue;
}

export async function enqueueWalletJob(
  paymentId: string | undefined,
  jobType: WalletJobData['jobType'],
  payload?: Record<string, unknown>,
): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    logger.debug({ paymentId, jobType }, 'Wallet job skipped in test environment');
    return;
  }

  try {
    const queue = getWalletQueue();
    const delay =
      payload?.runAfter && typeof payload.runAfter === 'string'
        ? Math.max(0, new Date(payload.runAfter).getTime() - Date.now())
        : undefined;

    await queue.add(
      jobType,
      {
        jobType,
        ...(paymentId !== undefined && { paymentId }),
        ...(payload && { payload }),
      },
      {
        jobId: `${jobType}-${paymentId ?? 'batch'}-${Date.now()}`,
        ...(delay !== undefined && { delay }),
      },
    );
  } catch (error) {
    logger.warn({ paymentId, jobType, err: error }, 'Failed to enqueue wallet job');
  }
}

async function processWalletJob(job: Job<WalletJobData>): Promise<void> {
  const { paymentId, jobType } = job.data;
  logger.info({ paymentId, jobType }, 'Processing wallet job');

  const { walletService } = await import('../service/wallet.service.js');

  switch (jobType) {
    case WALLET_CONSTANTS.JOB_TYPES.SETTLE_PAYMENT:
      if (paymentId) {
        await walletService.settlePayment(paymentId);
      }
      break;
    case WALLET_CONSTANTS.JOB_TYPES.PROCESS_SETTLEMENT_BATCH:
      await walletService.processSettlementBatch();
      break;
    case WALLET_CONSTANTS.JOB_TYPES.REVERSE_REFUND:
      if (paymentId) {
        await walletService.reverseHostEarningsFromPayment(paymentId);
      }
      break;
    default:
      logger.warn({ jobType }, 'Unknown wallet job type');
  }
}

export function startWalletWorker(): Worker<WalletJobData> {
  if (!walletWorker) {
    walletWorker = new Worker<WalletJobData>(
      WALLET_CONSTANTS.QUEUE_NAME,
      processWalletJob,
      { connection: getConnection() },
    );
    walletWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'Wallet job failed');
    });
  }
  return walletWorker;
}

export async function closeWalletQueue(): Promise<void> {
  if (walletWorker) {
    await walletWorker.close();
    walletWorker = null;
  }
  if (walletQueue) {
    await walletQueue.close();
    walletQueue = null;
  }
}

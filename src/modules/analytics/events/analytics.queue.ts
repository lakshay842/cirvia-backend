import { Queue, Worker, type Job } from 'bullmq';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';
import { getRedisClient } from '@redis/index.js';
import { ANALYTICS_CONSTANTS } from '../constants/analytics.constants.js';

const logger = getLogger();

export interface AnalyticsJobData {
  jobType: (typeof ANALYTICS_CONSTANTS.JOB_TYPES)[keyof typeof ANALYTICS_CONSTANTS.JOB_TYPES];
  date?: string;
}

let analyticsQueue: Queue<AnalyticsJobData> | null = null;
let analyticsWorker: Worker<AnalyticsJobData> | null = null;

function getConnection() {
  const config = getConfig();
  const redis = getRedisClient();
  return {
    host: new URL(config.REDIS_URL).hostname,
    port: Number(new URL(config.REDIS_URL).port || 6379),
    ...(redis.options.password ? { password: redis.options.password } : {}),
  };
}

export function getAnalyticsQueue(): Queue<AnalyticsJobData> {
  if (!analyticsQueue) {
    analyticsQueue = new Queue<AnalyticsJobData>(ANALYTICS_CONSTANTS.QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 2,
      },
    });
  }
  return analyticsQueue;
}

export async function enqueueAnalyticsJob(
  jobType: AnalyticsJobData['jobType'],
  data: Omit<AnalyticsJobData, 'jobType'> = {},
): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;
  try {
    await getAnalyticsQueue().add(jobType, { jobType, ...data });
  } catch (error) {
    logger.warn({ jobType, err: error }, 'Failed to enqueue analytics job');
  }
}

async function processAnalyticsJob(job: Job<AnalyticsJobData>): Promise<void> {
  logger.info({ jobType: job.data.jobType, jobId: job.id }, 'Processing analytics aggregation job');
}

export function startAnalyticsWorker(): void {
  if (analyticsWorker || process.env.NODE_ENV === 'test') return;
  analyticsWorker = new Worker<AnalyticsJobData>(ANALYTICS_CONSTANTS.QUEUE_NAME, processAnalyticsJob, {
    connection: getConnection(),
    concurrency: 1,
  });
}

export async function closeAnalyticsQueue(): Promise<void> {
  if (analyticsWorker) {
    await analyticsWorker.close();
    analyticsWorker = null;
  }
  if (analyticsQueue) {
    await analyticsQueue.close();
    analyticsQueue = null;
  }
}

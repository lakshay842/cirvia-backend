import { Queue, Worker, type Job } from 'bullmq';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';
import { getRedisClient } from '@redis/index.js';
import { REVIEWS_CONSTANTS } from '../constants/reviews.constants.js';

const logger = getLogger();

export interface ReviewJobData {
  jobType: (typeof REVIEWS_CONSTANTS.JOB_TYPES)[keyof typeof REVIEWS_CONSTANTS.JOB_TYPES];
  userId?: string;
  hostId?: string;
  eventId?: string;
}

let reviewQueue: Queue<ReviewJobData> | null = null;
let reviewWorker: Worker<ReviewJobData> | null = null;

function getConnection() {
  const config = getConfig();
  const redis = getRedisClient();
  return {
    host: new URL(config.REDIS_URL).hostname,
    port: Number(new URL(config.REDIS_URL).port || 6379),
    ...(redis.options.password ? { password: redis.options.password } : {}),
  };
}

export function getReviewQueue(): Queue<ReviewJobData> {
  if (!reviewQueue) {
    reviewQueue = new Queue<ReviewJobData>(REVIEWS_CONSTANTS.QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }
  return reviewQueue;
}

export async function enqueueReviewJob(
  jobType: ReviewJobData['jobType'],
  data: Omit<ReviewJobData, 'jobType'>,
): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    logger.debug({ jobType, ...data }, 'Review job skipped in test environment');
    return;
  }

  try {
    const queue = getReviewQueue();
    const id = data.userId ?? data.hostId ?? data.eventId ?? 'job';
    await queue.add(jobType, { jobType, ...data }, { jobId: `${jobType}-${id}-${Date.now()}` });
  } catch (error) {
    logger.warn({ jobType, err: error }, 'Failed to enqueue review job');
  }
}

async function processReviewJob(job: Job<ReviewJobData>): Promise<void> {
  const { jobType, userId, hostId, eventId } = job.data;
  logger.info({ jobType, jobId: job.id }, 'Processing review job');

  const { reviewsService } = await import('../service/reviews.service.js');

  switch (jobType) {
    case REVIEWS_CONSTANTS.JOB_TYPES.RECALC_TRUST_SCORE:
      if (userId) await reviewsService.processRecalcTrustScore(userId);
      break;
    case REVIEWS_CONSTANTS.JOB_TYPES.RECALC_HOST_RATING:
      if (hostId) await reviewsService.processRecalcHostRating(hostId);
      break;
    case REVIEWS_CONSTANTS.JOB_TYPES.RECALC_EVENT_STATS:
      if (eventId) await reviewsService.processRecalcEventStats(eventId);
      break;
    default:
      logger.warn({ jobType }, 'Unknown review job type');
  }
}

export function startReviewWorker(): Worker<ReviewJobData> {
  if (!reviewWorker) {
    reviewWorker = new Worker<ReviewJobData>(
      REVIEWS_CONSTANTS.QUEUE_NAME,
      processReviewJob,
      { connection: getConnection() },
    );
    reviewWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'Review job failed');
    });
  }
  return reviewWorker;
}

export async function closeReviewQueue(): Promise<void> {
  if (reviewWorker) {
    await reviewWorker.close();
    reviewWorker = null;
  }
  if (reviewQueue) {
    await reviewQueue.close();
    reviewQueue = null;
  }
}

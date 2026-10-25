import { Queue, Worker, type Job } from 'bullmq';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';
import { getRedisClient } from '@redis/index.js';
import { NOTIFICATIONS_CONSTANTS } from '../constants/notifications.constants.js';

const logger = getLogger();

export interface NotificationJobData {
  jobType: (typeof NOTIFICATIONS_CONSTANTS.JOB_TYPES)[keyof typeof NOTIFICATIONS_CONSTANTS.JOB_TYPES];
  trigger?: string;
  payload?: Record<string, unknown>;
  userId?: string;
  notificationId?: string;
  title?: string;
  message?: string;
  dataJson?: Record<string, unknown>;
}

let notificationQueue: Queue<NotificationJobData> | null = null;
let notificationWorker: Worker<NotificationJobData> | null = null;

function getConnection() {
  const config = getConfig();
  const redis = getRedisClient();
  return {
    host: new URL(config.REDIS_URL).hostname,
    port: Number(new URL(config.REDIS_URL).port || 6379),
    ...(redis.options.password ? { password: redis.options.password } : {}),
  };
}

export function getNotificationQueue(): Queue<NotificationJobData> {
  if (!notificationQueue) {
    notificationQueue = new Queue<NotificationJobData>(NOTIFICATIONS_CONSTANTS.QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }
  return notificationQueue;
}

export async function enqueueNotificationJob(
  jobType: NotificationJobData['jobType'],
  data: Omit<NotificationJobData, 'jobType'>,
): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    logger.debug({ jobType, ...data }, 'Notification job skipped in test environment');
    return;
  }

  try {
    const queue = getNotificationQueue();
    const jobId = `${jobType}-${data.userId ?? data.trigger ?? 'job'}-${Date.now()}`;
    await queue.add(jobType, { jobType, ...data }, { jobId });
  } catch (error) {
    logger.warn({ jobType, err: error }, 'Failed to enqueue notification job');
  }
}

async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  const { jobType } = job.data;
  logger.info({ jobType, jobId: job.id }, 'Processing notification job');

  const { notificationsService } = await import('../service/notifications.service.js');

  switch (jobType) {
    case NOTIFICATIONS_CONSTANTS.JOB_TYPES.DISPATCH:
      if (job.data.trigger) {
        await notificationsService.processTrigger(job.data.trigger, job.data.payload ?? {});
      }
      break;
    case NOTIFICATIONS_CONSTANTS.JOB_TYPES.SEND_EMAIL:
      if (job.data.userId && job.data.title && job.data.message) {
        await notificationsService.sendEmailJob({
          userId: job.data.userId,
          title: job.data.title,
          message: job.data.message,
          ...(job.data.notificationId !== undefined && { notificationId: job.data.notificationId }),
        });
      }
      break;
    case NOTIFICATIONS_CONSTANTS.JOB_TYPES.SEND_PUSH:
      if (job.data.userId && job.data.title && job.data.message) {
        await notificationsService.sendPushJob({
          userId: job.data.userId,
          title: job.data.title,
          message: job.data.message,
          ...(job.data.notificationId !== undefined && { notificationId: job.data.notificationId }),
          ...(job.data.dataJson !== undefined && { dataJson: job.data.dataJson }),
        });
      }
      break;
    default:
      logger.warn({ jobType }, 'Unknown notification job type');
  }
}

export function startNotificationWorker(): Worker<NotificationJobData> {
  if (!notificationWorker) {
    notificationWorker = new Worker<NotificationJobData>(
      NOTIFICATIONS_CONSTANTS.QUEUE_NAME,
      processNotificationJob,
      { connection: getConnection() },
    );
    notificationWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'Notification job failed');
    });
  }
  return notificationWorker;
}

export async function closeNotificationQueue(): Promise<void> {
  if (notificationWorker) {
    await notificationWorker.close();
    notificationWorker = null;
  }
  if (notificationQueue) {
    await notificationQueue.close();
    notificationQueue = null;
  }
}

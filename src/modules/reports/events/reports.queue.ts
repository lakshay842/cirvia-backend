import { Queue, Worker, type Job } from 'bullmq';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';
import { getRedisClient } from '@redis/index.js';
import { REPORTS_CONSTANTS } from '../constants/reports.constants.js';

const logger = getLogger();

export interface ReportJobData {
  jobType: (typeof REPORTS_CONSTANTS.JOB_TYPES)[keyof typeof REPORTS_CONSTANTS.JOB_TYPES];
  reportId?: string;
  userId?: string;
  moderatorId?: string;
  status?: string;
}

let reportQueue: Queue<ReportJobData> | null = null;
let reportWorker: Worker<ReportJobData> | null = null;

function getConnection() {
  const config = getConfig();
  const redis = getRedisClient();
  return {
    host: new URL(config.REDIS_URL).hostname,
    port: Number(new URL(config.REDIS_URL).port || 6379),
    ...(redis.options.password ? { password: redis.options.password } : {}),
  };
}

export function getReportQueue(): Queue<ReportJobData> {
  if (!reportQueue) {
    reportQueue = new Queue<ReportJobData>(REPORTS_CONSTANTS.QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }
  return reportQueue;
}

export async function enqueueReportJob(
  jobType: ReportJobData['jobType'],
  data: Omit<ReportJobData, 'jobType'>,
): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    logger.debug({ jobType, ...data }, 'Report job skipped in test environment');
    return;
  }

  try {
    const queue = getReportQueue();
    const jobId = `${jobType}-${data.reportId ?? data.userId ?? 'job'}-${Date.now()}`;
    await queue.add(jobType, { jobType, ...data }, { jobId });
  } catch (error) {
    logger.warn({ jobType, err: error }, 'Failed to enqueue report job');
  }
}

async function processReportJob(job: Job<ReportJobData>): Promise<void> {
  const { jobType } = job.data;
  logger.info({ jobType, jobId: job.id }, 'Processing report job');

  const { bridgeReportEventToNotifications } = await import('./reports.events.js');

  switch (jobType) {
    case REPORTS_CONSTANTS.JOB_TYPES.NOTIFY_REPORTER:
      if (job.data.userId && job.data.reportId) {
        await bridgeReportEventToNotifications('report.status_updated', {
          userId: job.data.userId,
          reportId: job.data.reportId,
          status: job.data.status,
        });
      }
      break;
    case REPORTS_CONSTANTS.JOB_TYPES.NOTIFY_ASSIGNEE:
      if (job.data.moderatorId && job.data.reportId) {
        await bridgeReportEventToNotifications('report.assigned', {
          userId: job.data.moderatorId,
          reportId: job.data.reportId,
        });
      }
      break;
    case REPORTS_CONSTANTS.JOB_TYPES.RECALC_TRUST:
      logger.debug({ reportId: job.data.reportId }, 'Trust score recalc stub for report');
      break;
    default:
      logger.warn({ jobType }, 'Unknown report job type');
  }
}

export function startReportWorker(): void {
  if (reportWorker || process.env.NODE_ENV === 'test') return;

  reportWorker = new Worker<ReportJobData>(REPORTS_CONSTANTS.QUEUE_NAME, processReportJob, {
    connection: getConnection(),
    concurrency: 2,
  });

  reportWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Report job failed');
  });
}

export async function closeReportQueue(): Promise<void> {
  if (reportWorker) {
    await reportWorker.close();
    reportWorker = null;
  }
  if (reportQueue) {
    await reportQueue.close();
    reportQueue = null;
  }
}

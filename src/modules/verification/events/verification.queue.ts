import { Queue, Worker, type Job } from 'bullmq';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';
import { getRedisClient } from '@redis/index.js';
import { VERIFICATION_CONSTANTS, type VerificationJobType } from '../constants/verification.constants.js';
import { getVerificationProvider } from '../providers/verification-provider.registry.js';

const logger = getLogger();

export interface VerificationJobData {
  verificationId: string;
  userId: string;
  jobType: VerificationJobType;
  provider?: string;
  payload?: Record<string, unknown>;
}

let verificationQueue: Queue<VerificationJobData> | null = null;
let verificationWorker: Worker<VerificationJobData> | null = null;

function getConnection() {
  const config = getConfig();
  const redis = getRedisClient();
  return {
    host: new URL(config.REDIS_URL).hostname,
    port: Number(new URL(config.REDIS_URL).port || 6379),
    ...(redis.options.password ? { password: redis.options.password } : {}),
  };
}

export function getVerificationQueue(): Queue<VerificationJobData> {
  if (!verificationQueue) {
    verificationQueue = new Queue<VerificationJobData>(VERIFICATION_CONSTANTS.QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }
  return verificationQueue;
}

async function processVerificationJob(job: Job<VerificationJobData>): Promise<void> {
  const { verificationId, userId, jobType, provider } = job.data;
  logger.info({ verificationId, userId, jobType, provider }, 'Processing verification job (stub)');

  switch (jobType) {
    case VERIFICATION_CONSTANTS.JOB_TYPES.OCR_PROCESSING:
    case VERIFICATION_CONSTANTS.JOB_TYPES.FACE_MATCH:
    case VERIFICATION_CONSTANTS.JOB_TYPES.AI_VERIFICATION:
    case VERIFICATION_CONSTANTS.JOB_TYPES.DOCUMENT_VALIDATION: {
      const selectedProvider = getVerificationProvider(provider ?? VERIFICATION_CONSTANTS.PROVIDERS.MANUAL);
      await selectedProvider.verify({
        verificationId,
        userId,
        documentType: 'AADHAAR',
        frontImageKey: '',
      });
      break;
    }
    default:
      logger.warn({ jobType }, 'Unknown verification job type');
  }
}

export function startVerificationWorker(): Worker<VerificationJobData> {
  if (!verificationWorker) {
    verificationWorker = new Worker<VerificationJobData>(
      VERIFICATION_CONSTANTS.QUEUE_NAME,
      processVerificationJob,
      { connection: getConnection() },
    );
    verificationWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'Verification job failed');
    });
  }
  return verificationWorker;
}

export async function enqueueVerificationJob(data: VerificationJobData): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    logger.debug({ data }, 'Verification job skipped in test environment');
    return;
  }
  await getVerificationQueue().add(data.jobType, data, {
    jobId: `${data.jobType}:${data.verificationId}:${Date.now()}`,
  });
}

export async function closeVerificationQueue(): Promise<void> {
  if (verificationWorker) {
    await verificationWorker.close();
    verificationWorker = null;
  }
  if (verificationQueue) {
    await verificationQueue.close();
    verificationQueue = null;
  }
}

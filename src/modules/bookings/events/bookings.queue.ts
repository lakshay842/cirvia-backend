import { Queue, Worker, type Job } from 'bullmq';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';
import { getRedisClient } from '@redis/index.js';
import { BOOKINGS_CONSTANTS } from '../constants/bookings.constants.js';

const logger = getLogger();

export interface BookingJobData {
  bookingId: string;
  jobType: (typeof BOOKINGS_CONSTANTS.JOB_TYPES)[keyof typeof BOOKINGS_CONSTANTS.JOB_TYPES];
}

let bookingQueue: Queue<BookingJobData> | null = null;
let bookingWorker: Worker<BookingJobData> | null = null;

function getConnection() {
  const config = getConfig();
  const redis = getRedisClient();
  return {
    host: new URL(config.REDIS_URL).hostname,
    port: Number(new URL(config.REDIS_URL).port || 6379),
    ...(redis.options.password ? { password: redis.options.password } : {}),
  };
}

export function getBookingQueue(): Queue<BookingJobData> {
  if (!bookingQueue) {
    bookingQueue = new Queue<BookingJobData>(BOOKINGS_CONSTANTS.QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
      },
    });
  }
  return bookingQueue;
}

export async function scheduleBookingExpiry(bookingId: string, expiresAt: Date): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    logger.debug({ bookingId }, 'Booking expiry job skipped in test environment');
    return;
  }
  const delay = Math.max(0, expiresAt.getTime() - Date.now());
  try {
    const queue = getBookingQueue();
    await queue.add(
      BOOKINGS_CONSTANTS.JOB_TYPES.EXPIRE_RESERVATION,
      { bookingId, jobType: BOOKINGS_CONSTANTS.JOB_TYPES.EXPIRE_RESERVATION },
      { jobId: `expire-${bookingId}`, delay },
    );
    logger.info({ bookingId, delayMs: delay }, 'Scheduled booking expiry job');
  } catch (error) {
    logger.warn({ bookingId, err: error }, 'Failed to schedule booking expiry — Redis/BullMQ unavailable');
  }
}

async function processBookingJob(job: Job<BookingJobData>): Promise<void> {
  const { bookingId, jobType } = job.data;
  logger.info({ bookingId, jobType }, 'Processing booking job');

  switch (jobType) {
    case BOOKINGS_CONSTANTS.JOB_TYPES.EXPIRE_RESERVATION: {
      const { bookingsService } = await import('../service/bookings.service.js');
      await bookingsService.expireBooking(bookingId);
      break;
    }
    case BOOKINGS_CONSTANTS.JOB_TYPES.PROMOTE_WAITLIST:
      logger.info({ bookingId }, 'Waitlist promotion job stub');
      break;
    default:
      logger.warn({ jobType }, 'Unknown booking job type');
  }
}

export function startBookingWorker(): Worker<BookingJobData> {
  if (!bookingWorker) {
    bookingWorker = new Worker<BookingJobData>(
      BOOKINGS_CONSTANTS.QUEUE_NAME,
      processBookingJob,
      { connection: getConnection() },
    );
    bookingWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'Booking job failed');
    });
  }
  return bookingWorker;
}

export async function closeBookingQueue(): Promise<void> {
  if (bookingWorker) {
    await bookingWorker.close();
    bookingWorker = null;
  }
  if (bookingQueue) {
    await bookingQueue.close();
    bookingQueue = null;
  }
}

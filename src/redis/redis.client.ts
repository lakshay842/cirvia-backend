import { Redis, type Redis as RedisClient } from 'ioredis';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';

const logger = getLogger();

let redisClient: RedisClient | null = null;

export function getRedisClient(): RedisClient {
  if (!redisClient) {
    const config = getConfig();
    const client = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    client.on('error', (error: Error) => {
      logger.error({ err: error }, 'Redis connection error');
    });

    client.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient = client;
  }
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  if (client.status === 'ready' || client.status === 'connecting') {
    return;
  }
  await client.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
}

export async function checkRedisHealth(): Promise<{
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const client = getRedisClient();
    const result = await client.ping();
    if (result !== 'PONG') {
      throw new Error(`Unexpected Redis ping response: ${result}`);
    }
    return {
      status: 'up',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown Redis error',
    };
  }
}

export function resetRedisForTesting(): void {
  redisClient = null;
}

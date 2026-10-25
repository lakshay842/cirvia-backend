import { Router, type Request, type Response } from 'express';
import { sendSuccess } from '@common/index.js';
import { getConfig } from '@config/index.js';
import { checkDatabaseHealth } from '@database/index.js';
import { checkRedisHealth } from '@redis/index.js';

const router = Router();
const startTime = Date.now();

router.get('/health', async (_req: Request, res: Response) => {
  const config = getConfig();
  const [database, redis] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

  const isHealthy = database.status === 'up' && redis.status === 'up';

  return sendSuccess(res, {
    message: isHealthy ? 'Service is healthy' : 'Service is degraded',
    data: {
      status: isHealthy ? 'healthy' : 'degraded',
      version: config.APP_VERSION,
      environment: config.NODE_ENV,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        database,
        redis,
      },
    },
    statusCode: isHealthy ? 200 : 503,
  });
});

router.get('/ready', async (_req: Request, res: Response) => {
  const [database, redis] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);
  const isReady = database.status === 'up' && redis.status === 'up';

  return sendSuccess(res, {
    message: isReady ? 'Service is ready' : 'Service is not ready',
    data: {
      ready: isReady,
      database: database.status,
      redis: redis.status,
    },
    statusCode: isReady ? 200 : 503,
  });
});

router.get('/live', (_req: Request, res: Response) => {
  const config = getConfig();

  return sendSuccess(res, {
    message: 'Service is alive',
    data: {
      alive: true,
      version: config.APP_VERSION,
      environment: config.NODE_ENV,
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      pid: process.pid,
    },
  });
});

export const healthRouter = router;

import { beforeEach, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.APP_VERSION = '1.0.0-test';
process.env.API_PREFIX = '/api/v1';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-min-32-chars';
process.env.CORS_ORIGINS = 'http://localhost:3001';

vi.mock('@database/index.js', () => ({
  prisma: {},
  connectDatabase: vi.fn().mockResolvedValue(undefined),
  disconnectDatabase: vi.fn().mockResolvedValue(undefined),
  checkDatabaseHealth: vi.fn().mockResolvedValue({ status: 'up', latencyMs: 2 }),
}));

vi.mock('@redis/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/redis/index.js')>();
  return {
    ...actual,
    getRedisClient: vi.fn(() => ({
      call: vi.fn().mockResolvedValue(1),
      status: 'ready',
      connect: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined),
    })),
    connectRedis: vi.fn().mockResolvedValue(undefined),
    disconnectRedis: vi.fn().mockResolvedValue(undefined),
    checkRedisHealth: vi.fn().mockResolvedValue({ status: 'up', latencyMs: 1 }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

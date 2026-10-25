import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '@redis/index.js';
import { getConfig } from '@config/index.js';
import { RateLimitError } from '@errors/index.js';

export function createRateLimiter(options: {
  windowMs?: number;
  max: number;
  prefix: string;
}) {
  const config = getConfig();

  const baseOptions = {
    windowMs: options.windowMs ?? config.RATE_LIMIT_WINDOW_MS,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: unknown, _res: unknown, next: (error?: unknown) => void) => {
      next(new RateLimitError());
    },
  };

  if (config.NODE_ENV === 'test') {
    return rateLimit(baseOptions);
  }

  return rateLimit({
    ...baseOptions,
    store: new RedisStore({
      sendCommand: (command: string, ...args: string[]) =>
        getRedisClient().call(command, ...args) as Promise<number>,
      prefix: `rl:${options.prefix}:`,
    }),
  });
}

export function authRateLimiter() {
  return createRateLimiter({
    max: getConfig().RATE_LIMIT_AUTH,
    prefix: 'auth',
  });
}

export function searchRateLimiter() {
  return createRateLimiter({
    max: getConfig().RATE_LIMIT_SEARCH,
    prefix: 'search',
  });
}

export function bookingRateLimiter() {
  return createRateLimiter({
    max: getConfig().RATE_LIMIT_BOOKING,
    prefix: 'booking',
  });
}

export function paymentRateLimiter() {
  return createRateLimiter({
    max: getConfig().RATE_LIMIT_PAYMENT,
    prefix: 'payment',
  });
}

export function adminRateLimiter() {
  return createRateLimiter({
    max: getConfig().RATE_LIMIT_ADMIN,
    prefix: 'admin',
  });
}

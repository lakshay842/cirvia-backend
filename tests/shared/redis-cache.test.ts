import { describe, it, expect } from 'vitest';
import { REDIS_CACHE_POLICY, invalidateCacheKeys } from '../../src/shared/cache/redis-cache-policy.js';

describe('Redis cache policy', () => {
  it('defines TTL tiers', () => {
    expect(REDIS_CACHE_POLICY.TTL.SHORT).toBe(120);
    expect(REDIS_CACHE_POLICY.TTL.MEDIUM).toBe(300);
    expect(REDIS_CACHE_POLICY.TTL.LONG).toBe(900);
  });

  it('builds namespaced cache keys', () => {
    const eventId = '550e8400-e29b-41d4-a716-446655440000';
    expect(REDIS_CACHE_POLICY.keys.bookingCapacity(eventId)).toBe(
      `cache:booking:capacity:${eventId}`,
    );
  });

  it('returns invalidation key sets', () => {
    const keys = REDIS_CACHE_POLICY.invalidatePatterns.booking(
      'event-1',
      'booking-1',
    );
    expect(keys).toContain('cache:booking:capacity:event-1');
    expect(keys).toContain('cache:booking:details:booking-1');
  });

  it('includes username in user invalidation', () => {
    const keys = REDIS_CACHE_POLICY.invalidatePatterns.user('user-1', 'aarav');
    expect(keys).toContain('cache:user:public:aarav');
  });

  it('invalidateCacheKeys skips wildcard patterns', async () => {
    const deleted: string[] = [];
    const mockRedis = {
      del: (...keys: string[]) => {
        deleted.push(...keys);
        return Promise.resolve(1);
      },
    };
    await invalidateCacheKeys(mockRedis, [
      'cache:booking:count:event-1',
      'cache:event:list:*',
    ]);
    expect(deleted).toEqual(['cache:booking:count:event-1']);
  });
});

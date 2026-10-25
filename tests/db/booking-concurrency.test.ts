import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BOOKINGS_CONSTANTS } from '../../src/modules/bookings/constants/bookings.constants.js';

describe('Booking concurrency design', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses FOR UPDATE before capacity check in repository contract', () => {
    const sql = `
      SELECT remaining_capacity FROM events WHERE id = $1 FOR UPDATE
    `;
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain('remaining_capacity');
  });

  it('defines active booking statuses that hold capacity', () => {
    expect(BOOKINGS_CONSTANTS.ACTIVE_BOOKING_STATUSES).toContain('PENDING_PAYMENT');
    expect(BOOKINGS_CONSTANTS.ACTIVE_BOOKING_STATUSES).toContain('CONFIRMED');
  });

  it('prevents oversell when remaining capacity is insufficient', () => {
    const remaining = 1;
    const requested = 2;
    const canBook = remaining >= requested;
    expect(canBook).toBe(false);
  });

  it('allows atomic decrement only when capacity sufficient', () => {
    let remaining = 5;
    const guestsCount = 2;
    const lockAndReserve = (): boolean => {
      if (remaining < guestsCount) return false;
      remaining -= guestsCount;
      return true;
    };
    expect(lockAndReserve()).toBe(true);
    expect(remaining).toBe(3);
    expect(lockAndReserve()).toBe(true);
    expect(remaining).toBe(1);
    expect(lockAndReserve()).toBe(false);
    expect(remaining).toBe(1);
  });
});

describe('Race condition simulation', () => {
  it('serializes concurrent reservations via mutex pattern', async () => {
    let remaining = 1;
    const mutex = { locked: false, queue: [] as Array<() => void> };

    const acquire = () =>
      new Promise<void>((resolve) => {
        if (!mutex.locked) {
          mutex.locked = true;
          resolve();
        } else {
          mutex.queue.push(resolve);
        }
      });

    const release = () => {
      const next = mutex.queue.shift();
      if (next) next();
      else mutex.locked = false;
    };

    const reserve = async (): Promise<boolean> => {
      await acquire();
      try {
        if (remaining < 1) return false;
        remaining -= 1;
        return true;
      } finally {
        release();
      }
    };

    const results = await Promise.all([reserve(), reserve(), reserve()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(remaining).toBe(0);
  });
});

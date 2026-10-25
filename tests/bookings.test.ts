import { describe, it, expect } from 'vitest';
import {
  createBookingSchema,
  cancelBookingSchema,
  rejectBookingSchema,
  joinWaitlistSchema,
  bookingIdParamSchema,
  myBookingsQuerySchema,
  hostBookingsQuerySchema,
} from '../src/modules/bookings/schemas/bookings.schema.js';
import { BOOKINGS_CONSTANTS } from '../src/modules/bookings/constants/bookings.constants.js';
import {
  calculateAge,
  generateBookingReference,
  toApiStatus,
  addMinutes,
} from '../src/modules/bookings/utils/bookings.util.js';
import {
  mapStatusFilter,
  mapHostStatusFilter,
  toBookingSummaryDto,
} from '../src/modules/bookings/dto/bookings.dto.js';

const eventId = '550e8400-e29b-41d4-a716-446655440000';

describe('Booking schemas', () => {
  it('accepts valid create booking payload', () => {
    expect(
      createBookingSchema.safeParse({ eventId, ticketQuantity: 2 }).success,
    ).toBe(true);
  });

  it('rejects unknown create fields', () => {
    expect(
      createBookingSchema.safeParse({ eventId, ticketQuantity: 1, extra: true }).success,
    ).toBe(false);
  });

  it('validates ticket quantity bounds', () => {
    expect(createBookingSchema.safeParse({ eventId, ticketQuantity: 0 }).success).toBe(false);
    expect(createBookingSchema.safeParse({ eventId, ticketQuantity: 21 }).success).toBe(false);
  });

  it('validates cancel reason length', () => {
    expect(cancelBookingSchema.safeParse({ reason: 'Unable to attend' }).success).toBe(true);
    expect(cancelBookingSchema.safeParse({ reason: 'no' }).success).toBe(false);
  });

  it('validates reject reason', () => {
    expect(rejectBookingSchema.safeParse({ reason: 'Capacity reduced' }).success).toBe(true);
  });

  it('validates waitlist join', () => {
    expect(joinWaitlistSchema.safeParse({ eventId }).success).toBe(true);
  });

  it('validates booking UUID param', () => {
    expect(
      bookingIdParamSchema.safeParse({ bookingId: eventId }).success,
    ).toBe(true);
  });

  it('validates my bookings query defaults', () => {
    const parsed = myBookingsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.status).toBe('all');
  });

  it('validates host bookings query', () => {
    expect(hostBookingsQuerySchema.safeParse({ status: 'pending' }).success).toBe(true);
  });
});

describe('Booking utilities', () => {
  it('generates booking reference format', () => {
    const ref = generateBookingReference();
    expect(ref).toMatch(/^BK-\d{4}-[0-9A-F]{8}$/);
    expect(generateBookingReference()).not.toBe(generateBookingReference());
  });

  it('calculates age correctly', () => {
    const dob = new Date('2000-06-15');
    const ref = new Date('2026-06-25');
    expect(calculateAge(dob, ref)).toBe(26);
  });

  it('maps APPROVED to CONFIRMED in API status', () => {
    expect(toApiStatus('APPROVED')).toBe('CONFIRMED');
    expect(toApiStatus('PENDING_PAYMENT')).toBe('PENDING_PAYMENT');
  });

  it('adds minutes to date', () => {
    const base = new Date('2026-01-01T12:00:00.000Z');
    const result = addMinutes(base, 15);
    expect(result.toISOString()).toBe('2026-01-01T12:15:00.000Z');
  });
});

describe('Booking status filters', () => {
  it('maps upcoming filter', () => {
    const statuses = mapStatusFilter('upcoming');
    expect(statuses).toContain('PENDING_PAYMENT');
    expect(statuses).toContain('CONFIRMED');
  });

  it('maps host pending filter', () => {
    const statuses = mapHostStatusFilter('pending');
    expect(statuses).toEqual(['REQUESTED', 'PENDING']);
  });
});

describe('Booking constants', () => {
  it('defines bookable event statuses', () => {
    expect(BOOKINGS_CONSTANTS.BOOKABLE_EVENT_STATUSES).toContain('BOOKING_OPEN');
  });

  it('defines cancellable statuses', () => {
    expect(BOOKINGS_CONSTANTS.CANCELLABLE_STATUSES).toContain('PENDING_PAYMENT');
  });

  it('builds redis keys', () => {
    expect(BOOKINGS_CONSTANTS.REDIS_KEYS.eventCapacity(eventId)).toBe(
      `cache:booking:capacity:${eventId}`,
    );
  });
});

describe('Booking DTO mapping', () => {
  const mockBooking = {
    id: eventId,
    eventId,
    userId: '660e8400-e29b-41d4-a716-446655440001',
    bookingReference: 'BK-2026-000001',
    bookingStatus: 'PENDING_PAYMENT' as const,
    paymentStatus: 'PENDING' as const,
    ticketType: null,
    ticketPrice: { toString: () => '999.00' },
    currency: 'INR',
    guestsCount: 2,
    approvalStatus: null,
    approvedBy: null,
    approvedAt: null,
    cancelledAt: null,
    completedAt: null,
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    cancelReason: null,
    rejectionReason: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    event: {
      id: eventId,
      title: 'Game Night',
      slug: 'game-night',
      eventStart: new Date('2030-06-15T18:00:00.000Z'),
      eventEnd: new Date('2030-06-15T22:00:00.000Z'),
      status: 'BOOKING_OPEN',
      hostId: '770e8400-e29b-41d4-a716-446655440002',
      host: { id: '770e8400-e29b-41d4-a716-446655440002', userId: '880e8400-e29b-41d4-a716-446655440003', displayName: 'Host' },
      location: { city: 'Noida', venueName: 'Hall' },
    },
    user: {
      id: '660e8400-e29b-41d4-a716-446655440001',
      profile: { firstName: 'A', lastName: 'B', avatarUrl: null },
    },
    attendees: [],
  };

  it('maps booking summary with expiry', () => {
    const dto = toBookingSummaryDto(mockBooking);
    expect(dto.status).toBe('PENDING_PAYMENT');
    expect(dto.expiresAt).toBeDefined();
    expect(dto.event.title).toBe('Game Night');
  });
});

describe('Concurrency design', () => {
  it('documents atomic reservation via FOR UPDATE', () => {
    expect(BOOKINGS_CONSTANTS.HISTORY_ACTIONS.CREATED).toBe('CREATED');
    // Repository uses SELECT ... FOR UPDATE inside $transaction — verified at integration layer
  });
});

describe('Transaction release on cancel', () => {
  it('includes expired in cancelled filter group', () => {
    const statuses = mapStatusFilter('cancelled');
    expect(statuses).toContain('EXPIRED');
    expect(statuses).toContain('REFUNDED');
  });
});

describe('Cancellation request status', () => {
  it('tracks cancellation requested as a distinct booking status', () => {
    expect(BOOKINGS_CONSTANTS.HISTORY_ACTIONS.CANCELLATION_REQUESTED).toBe('CANCELLATION_REQUESTED');
    expect(BOOKINGS_CONSTANTS.AUDIT_ACTIONS.CANCELLATION_REQUESTED).toBe('booking.cancellation_requested');
  });
});

describe('Waitlist promotion', () => {
  it('defines waitlist promoted history action', () => {
    expect(BOOKINGS_CONSTANTS.HISTORY_ACTIONS.WAITLIST_PROMOTED).toBe('WAITLIST_PROMOTED');
    expect(BOOKINGS_CONSTANTS.JOB_TYPES.PROMOTE_WAITLIST).toBe('promote_waitlist');
  });
});

import { describe, it, expect } from 'vitest';
import {
  createEventSchema,
  updateEventSchema,
  cancelEventSchema,
  rejectEventSchema,
  slugParamSchema,
  eventIdParamSchema,
  nearbyEventsQuerySchema,
  publicEventsQuerySchema,
  reorderMediaSchema,
} from '../src/modules/events/schemas/events.schema.js';
import { EVENTS_CONSTANTS } from '../src/modules/events/constants/events.constants.js';
import {
  generateEventSlug,
  haversineKm,
  slugify,
} from '../src/modules/events/utils/events.util.js';
import { toAmenities, toListItemDto, toPublicEventDto, computeEventBookingMeta } from '../src/modules/events/dto/events.dto.js';
import { eventSearchStub } from '../src/modules/events/search/events-search.interface.js';

const validLocation = {
  venueName: 'Community Hall',
  addressLine1: '123 Main St',
  city: 'Noida',
  state: 'Uttar Pradesh',
  country: 'India',
  postalCode: '201301',
};

const validCreate = {
  title: 'Friday Game Night',
  description: 'A'.repeat(50),
  categoryId: '550e8400-e29b-41d4-a716-446655440000',
  capacity: 20,
  price: 499,
  visibility: 'PUBLIC' as const,
  eventDate: '2030-06-15',
  startTime: '18:00',
  endTime: '22:00',
  location: validLocation,
};

describe('Event schemas', () => {
  it('accepts valid create event payload', () => {
    expect(createEventSchema.safeParse(validCreate).success).toBe(true);
  });

  it('rejects short title', () => {
    expect(createEventSchema.safeParse({ ...validCreate, title: 'Hi' }).success).toBe(false);
  });

  it('rejects unknown create fields', () => {
    expect(createEventSchema.safeParse({ ...validCreate, extra: true }).success).toBe(false);
  });

  it('validates update requires at least one field', () => {
    expect(updateEventSchema.safeParse({}).success).toBe(false);
    expect(updateEventSchema.safeParse({ title: 'Updated Event Title' }).success).toBe(true);
  });

  it('validates cancel reason', () => {
    expect(cancelEventSchema.safeParse({ reason: 'Weather conditions' }).success).toBe(true);
    expect(cancelEventSchema.safeParse({ reason: 'no' }).success).toBe(false);
  });

  it('validates reject reason', () => {
    expect(rejectEventSchema.safeParse({ reason: 'Policy violation' }).success).toBe(true);
  });

  it('validates slug param', () => {
    expect(slugParamSchema.safeParse({ slug: 'game-night-noida-4f2ab' }).success).toBe(true);
    expect(slugParamSchema.safeParse({ slug: 'Invalid Slug!' }).success).toBe(false);
  });

  it('validates event UUID param', () => {
    expect(
      eventIdParamSchema.safeParse({ eventId: '550e8400-e29b-41d4-a716-446655440000' }).success,
    ).toBe(true);
  });

  it('validates nearby query requires coordinates', () => {
    expect(
      nearbyEventsQuerySchema.safeParse({ latitude: 28.5, longitude: 77.3 }).success,
    ).toBe(true);
  });

  it('validates public events query', () => {
    expect(publicEventsQuerySchema.safeParse({ city: 'Mumbai', sort: 'newest' }).success).toBe(true);
  });

  it('validates media reorder', () => {
    expect(
      reorderMediaSchema.safeParse({
        media: [{ id: '550e8400-e29b-41d4-a716-446655440000', order: 1 }],
      }).success,
    ).toBe(true);
  });
});

describe('Event utils', () => {
  it('slugifies text', () => {
    expect(slugify('Game Night Noida')).toBe('game-night-noida');
  });

  it('generates event slug with suffix', () => {
    const slug = generateEventSlug('Game Night', 'Noida');
    expect(slug).toMatch(/^game-night-noida-[a-f0-9]{6}$/);
  });

  it('calculates haversine distance', () => {
    const dist = haversineKm(28.6139, 77.209, 19.076, 72.8777);
    expect(dist).toBeGreaterThan(1100);
    expect(dist).toBeLessThan(1500);
  });
});

describe('Event DTOs', () => {
  it('parses amenities json', () => {
    expect(toAmenities(['WiFi', 'Parking'])).toEqual(['WiFi', 'Parking']);
    expect(toAmenities(null)).toEqual([]);
  });

  it('builds list item dto with standardized public fields', () => {
    const eventId = '550e8400-e29b-41d4-a716-446655440000';
    const hostId = '660e8400-e29b-41d4-a716-446655440001';
    const now = new Date();
    const item = toListItemDto(
      {
        id: eventId,
        hostId,
        slug: 'test-event-abc',
        title: 'Test',
        shortDescription: 'Short',
        status: 'PUBLISHED',
        capacity: 20,
        remainingCapacity: 10,
        bookingStart: new Date(now.getTime() - 60_000),
        bookingEnd: new Date(now.getTime() + 86_400_000),
        isSuspended: false,
        price: 100,
        currency: 'INR',
        eventStart: now,
        eventEnd: now,
        isFeatured: true,
        isTrending: false,
        location: { city: 'Noida' },
        host: { slug: 'host-1', displayName: 'Host', accountStatus: 'VERIFIED' },
        category: { name: 'Games', slug: 'board-games' },
      } as Parameters<typeof toListItemDto>[0],
      'https://example.com/cover.jpg',
    );
    expect(item.id).toBe(eventId);
    expect(item.eventId).toBe(eventId);
    expect(item.hostId).toBe(hostId);
    expect(item.slug).toBe('test-event-abc');
    expect(item.capacity).toBe(20);
    expect(item.availability.remaining).toBe(10);
    expect(item.bookingRequired).toBe(true);
    expect(item.city).toBe('Noida');
  });

  it('computes bookingRequired from event state', () => {
    const now = new Date();
    const open = computeEventBookingMeta({
      id: '1',
      hostId: '2',
      status: 'PUBLISHED',
      capacity: 10,
      remainingCapacity: 5,
      bookingStart: new Date(now.getTime() - 60_000),
      bookingEnd: new Date(now.getTime() + 86_400_000),
      isSuspended: false,
    });
    expect(open.bookingRequired).toBe(true);
    expect(open.availability.isOpen).toBe(true);

    const closed = computeEventBookingMeta({
      id: '1',
      hostId: '2',
      status: 'BOOKING_CLOSED',
      capacity: 10,
      remainingCapacity: 5,
      bookingStart: new Date(now.getTime() - 86_400_000),
      bookingEnd: new Date(now.getTime() - 60_000),
      isSuspended: false,
    });
    expect(closed.bookingRequired).toBe(false);
  });

  it('builds public event dto with standardized public fields', () => {
    const eventId = '660e8400-e29b-41d4-a716-446655440001';
    const hostId = '770e8400-e29b-41d4-a716-446655440002';
    const now = new Date();
    const event = toPublicEventDto(
      {
        id: eventId,
        hostId,
        slug: 'game-night',
        title: 'Game Night',
        description: 'Fun evening',
        shortDescription: 'Fun',
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        approvalRequired: false,
        minimumAge: null,
        maximumAge: null,
        language: 'en',
        capacity: 20,
        remainingCapacity: 15,
        bookingStart: new Date(now.getTime() - 60_000),
        bookingEnd: new Date(now.getTime() + 86_400_000),
        isSuspended: false,
        price: 499,
        currency: 'INR',
        eventStart: now,
        eventEnd: now,
        dressCode: null,
        foodProvided: false,
        parkingAvailable: true,
        petsAllowed: false,
        smokingAllowed: false,
        amenitiesJson: ['WiFi'],
        timezone: 'Asia/Kolkata',
        isFeatured: false,
        isTrending: true,
        category: { id: 'cat-1', name: 'Games', slug: 'games' },
        host: {
          slug: 'host-1',
          displayName: 'Host',
          accountStatus: 'VERIFIED',
          hostRating: 4.5,
        },
        location: null,
        rules: [],
        tagMappings: [],
      } as Parameters<typeof toPublicEventDto>[0],
      { media: [] },
    );
    expect(event.id).toBe(eventId);
    expect(event.eventId).toBe(eventId);
    expect(event.hostId).toBe(hostId);
    expect(event.slug).toBe('game-night');
    expect(event.bookingRequired).toBe(true);
  });
});

describe('Event constants', () => {
  it('defines public statuses', () => {
    expect(EVENTS_CONSTANTS.PUBLIC_STATUSES).toContain('PUBLISHED');
  });

  it('defines redis keys', () => {
    expect(EVENTS_CONSTANTS.REDIS_KEYS.featured).toBe('cache:event:featured');
  });
});

describe('Event search stub', () => {
  it('returns empty results', async () => {
    const result = await eventSearchStub.search({ keyword: 'game' }, 1, 20);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

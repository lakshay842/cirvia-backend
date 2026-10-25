import { describe, it, expect } from 'vitest';
import {
  becomeHostSchema,
  updateHostProfileSchema,
  updateHostAddressSchema,
  updateEmergencyContactSchema,
  updateHostPreferencesSchema,
  updateAvailabilitySchema,
  updateSocialLinksSchema,
  slugParamSchema,
  hostIdParamSchema,
  rejectHostSchema,
  adminHostListQuerySchema,
} from '../src/modules/hosts/schemas/hosts.schema.js';
import { HOST_CONSTANTS } from '../src/modules/hosts/constants/hosts.constants.js';
import { toPreferencesDto, toProfileCompletionDto, toStatisticsDto } from '../src/modules/hosts/dto/hosts.dto.js';
import { hostSearchStub } from '../src/modules/hosts/search/hosts-search.interface.js';

const validAddress = {
  addressLine1: '123 Main St',
  city: 'Mumbai',
  state: 'Maharashtra',
  country: 'India',
  postalCode: '400001',
};

const validBecomeHost = {
  bio: 'I love hosting curated social experiences for professionals.',
  experience: '3 years organizing meetups',
  languages: ['English', 'Hindi'],
  address: validAddress,
  emergencyContact: { name: 'Jane Doe', phone: '+919876543210' },
};

describe('Host schemas', () => {
  it('accepts valid become host payload', () => {
    expect(becomeHostSchema.safeParse(validBecomeHost).success).toBe(true);
  });

  it('rejects short bio', () => {
    expect(
      becomeHostSchema.safeParse({ ...validBecomeHost, bio: 'short' }).success,
    ).toBe(false);
  });

  it('rejects unknown become host fields', () => {
    expect(becomeHostSchema.safeParse({ ...validBecomeHost, extra: true }).success).toBe(false);
  });

  it('validates update profile requires at least one field', () => {
    expect(updateHostProfileSchema.safeParse({}).success).toBe(false);
    expect(updateHostProfileSchema.safeParse({ bio: 'Updated bio with enough length.' }).success).toBe(true);
  });

  it('validates address schema', () => {
    expect(updateHostAddressSchema.safeParse(validAddress).success).toBe(true);
  });

  it('validates emergency contact', () => {
    expect(
      updateEmergencyContactSchema.safeParse({ name: 'John', phone: '9876543210' }).success,
    ).toBe(true);
  });

  it('validates preferences partial update', () => {
    expect(updateHostPreferencesSchema.safeParse({ publicProfile: false }).success).toBe(true);
    expect(updateHostPreferencesSchema.safeParse({}).success).toBe(false);
  });

  it('validates availability slots', () => {
    expect(
      updateAvailabilitySchema.safeParse({
        availability: [{ day: 'MON', startTime: '09:00', endTime: '17:00' }],
      }).success,
    ).toBe(true);
  });

  it('validates social links', () => {
    expect(
      updateSocialLinksSchema.safeParse({ website: 'https://example.com' }).success,
    ).toBe(true);
    expect(updateSocialLinksSchema.safeParse({ website: '' }).success).toBe(true);
  });

  it('validates slug param', () => {
    expect(slugParamSchema.safeParse({ slug: 'john-host-abc12345' }).success).toBe(true);
    expect(slugParamSchema.safeParse({ slug: 'Invalid Slug!' }).success).toBe(false);
  });

  it('validates host UUID param', () => {
    expect(
      hostIdParamSchema.safeParse({ hostId: '550e8400-e29b-41d4-a716-446655440000' }).success,
    ).toBe(true);
  });

  it('validates reject reason', () => {
    expect(rejectHostSchema.safeParse({ reason: 'Incomplete documents' }).success).toBe(true);
    expect(rejectHostSchema.safeParse({ reason: 'no' }).success).toBe(false);
  });

  it('validates admin list query', () => {
    expect(adminHostListQuerySchema.safeParse({ status: 'PENDING', page: 1 }).success).toBe(true);
  });
});

describe('Host DTOs', () => {
  it('returns default preferences when json is null', () => {
    const prefs = toPreferencesDto(null);
    expect(prefs.publicProfile).toBe(true);
    expect(prefs.notifyBookings).toBe(true);
  });

  it('merges stored preferences', () => {
    const prefs = toPreferencesDto({ showEmail: true, publicProfile: false });
    expect(prefs.showEmail).toBe(true);
    expect(prefs.publicProfile).toBe(false);
  });

  it('builds profile completion dto', () => {
    const completion = toProfileCompletionDto(67, ['bio', 'address'], ['avatar']);
    expect(completion.percentage).toBe(67);
    expect(completion.missing).toContain('avatar');
  });

  it('builds statistics dto from host profile', () => {
    const stats = toStatisticsDto(
      {
        totalEvents: 5,
        completedEvents: 3,
        followersCount: 10,
        hostRating: 4.5,
        responseRate: 95,
        responseTime: 30,
        totalReviews: 8,
        totalGuests: 50,
      } as Parameters<typeof toStatisticsDto>[0],
      {
        upcomingEvents: 2,
        earnings: 1000,
      } as Parameters<typeof toStatisticsDto>[1],
    );
    expect(stats.totalEvents).toBe(5);
    expect(stats.upcomingEvents).toBe(2);
    expect(stats.revenuePlaceholder).toBe(1000);
  });
});

describe('Host constants', () => {
  it('defines all profile completion fields', () => {
    expect(HOST_CONSTANTS.PROFILE_COMPLETION_FIELDS).toContain('bio');
    expect(HOST_CONSTANTS.PROFILE_COMPLETION_FIELDS).toContain('verification');
  });

  it('defines redis key builders', () => {
    expect(HOST_CONSTANTS.REDIS_KEYS.publicProfile('test-slug')).toBe('cache:host:slug:test-slug');
    expect(HOST_CONSTANTS.REDIS_KEYS.statistics('host-id')).toBe('cache:host:dashboard:host-id');
  });
});

describe('Host search stub', () => {
  it('returns empty results (architecture placeholder)', async () => {
    const result = await hostSearchStub.searchHosts({ city: 'Mumbai' }, 1, 20);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

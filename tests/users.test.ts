import { describe, it, expect } from 'vitest';
import {
  updateProfileSchema,
  updateInterestsSchema,
  updatePrivacySettingsSchema,
  updateAccountSettingsSchema,
  updateNotificationSettingsSchema,
  followUserBodySchema,
  usernameParamSchema,
  paginationQuerySchema,
} from '../src/modules/users/schemas/users.schema.js';
import { parsePagination, buildPaginationMeta } from '../src/utils/pagination.util.js';
import { USERS_CONSTANTS } from '../src/modules/users/constants/users.constants.js';

describe('User profile schema', () => {
  it('accepts valid profile update', () => {
    const result = updateProfileSchema.safeParse({
      firstName: 'John',
      bio: 'Hello world',
      city: 'Mumbai',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty profile update', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields', () => {
    const result = updateProfileSchema.safeParse({ firstName: 'John', extra: true });
    expect(result.success).toBe(false);
  });
});

describe('User interests schema', () => {
  it('accepts valid interests', () => {
    const result = updateInterestsSchema.safeParse({
      interests: ['Music', 'Travel'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects too many interests', () => {
    const result = updateInterestsSchema.safeParse({
      interests: Array.from({ length: 21 }, (_, i) => `Interest${i}`),
    });
    expect(result.success).toBe(false);
  });
});

describe('Settings schemas', () => {
  it('validates privacy settings', () => {
    const result = updatePrivacySettingsSchema.safeParse({
      profileVisibility: 'PUBLIC',
      showEmail: false,
    });
    expect(result.success).toBe(true);
  });

  it('validates account settings', () => {
    const result = updateAccountSettingsSchema.safeParse({
      language: 'en',
      timezone: 'Asia/Kolkata',
    });
    expect(result.success).toBe(true);
  });

  it('validates notification settings', () => {
    const result = updateNotificationSettingsSchema.safeParse({
      email: true,
      push: false,
    });
    expect(result.success).toBe(true);
  });
});

describe('Follow schema', () => {
  it('requires valid UUID for follow', () => {
    const result = followUserBodySchema.safeParse({
      userId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid follow body', () => {
    const result = followUserBodySchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });
});

describe('Username param schema', () => {
  it('accepts valid username', () => {
    const result = usernameParamSchema.safeParse({ username: 'john_doe' });
    expect(result.success).toBe(true);
  });

  it('rejects username with dashes', () => {
    const result = usernameParamSchema.safeParse({ username: 'john-doe' });
    expect(result.success).toBe(false);
  });
});

describe('Pagination utility', () => {
  it('parses pagination with defaults', () => {
    const result = parsePagination({}, {
      page: USERS_CONSTANTS.DEFAULT_PAGE,
      limit: USERS_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: USERS_CONSTANTS.MAX_LIMIT,
    });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
  });

  it('caps limit at max', () => {
    const result = parsePagination({ limit: 500 }, {
      page: 1,
      limit: 20,
      maxLimit: 100,
    });
    expect(result.limit).toBe(100);
  });

  it('builds pagination meta', () => {
    const meta = buildPaginationMeta(2, 10, 25);
    expect(meta.totalPages).toBe(3);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPreviousPage).toBe(true);
  });
});

describe('Pagination query schema', () => {
  it('coerces string page to number', () => {
    const result = paginationQuerySchema.safeParse({ page: '2', limit: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });
});

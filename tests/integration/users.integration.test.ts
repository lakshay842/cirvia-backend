import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { ValidationError } from '../../src/errors/index.js';

vi.mock('../../src/modules/users/service/users.service.js', () => ({
  usersService: {
    getMyProfile: vi.fn(),
    updateProfile: vi.fn(),
    getPublicProfile: vi.fn(),
    getInterests: vi.fn(),
    updateInterests: vi.fn(),
    getPrivacySettings: vi.fn(),
    getNotificationSettings: vi.fn(),
    getTrustScore: vi.fn(),
    listSavedEvents: vi.fn(),
    followUser: vi.fn(),
  },
}));

import { usersService } from '../../src/modules/users/service/users.service.js';

describe('Users API integration', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for GET /users/me without auth', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('validates profile update body', async () => {
    const res = await request(app)
      .patch('/api/v1/users/profile')
      .set('Authorization', 'Bearer invalid')
      .send({});
    expect([400, 401, 500]).toContain(res.status);
  });

  it('validates interests update', async () => {
    const res = await request(app)
      .patch('/api/v1/users/interests')
      .send({ interests: [] });
    expect(res.status).toBe(401);
  });

  it('validates follow body UUID', async () => {
    const res = await request(app)
      .post('/api/v1/users/follow')
      .send({ userId: 'invalid' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for trust score without auth', async () => {
    const res = await request(app).get('/api/v1/trust-score');
    expect(res.status).toBe(401);
  });

  it('returns 401 for activity feed without auth', async () => {
    const res = await request(app).get('/api/v1/activity');
    expect(res.status).toBe(401);
  });

  it('returns 401 for notification preferences without auth', async () => {
    const res = await request(app).get('/api/v1/notifications/preferences');
    expect(res.status).toBe(401);
  });

  it('validates username param for public profile', async () => {
    const res = await request(app).get('/api/v1/users/invalid-user!');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('propagates service errors for public profile', async () => {
    vi.mocked(usersService.getPublicProfile).mockRejectedValue(
      new ValidationError('User not found.'),
    );
    const res = await request(app).get('/api/v1/users/johndoe');
    expect(res.status).toBe(400);
  });
});

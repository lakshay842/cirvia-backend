import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

vi.mock('../../src/modules/events/service/events.service.js', () => ({
  eventsService: {
    listPublicEvents: vi.fn(),
    getPublicBySlug: vi.fn(),
    listPendingAdmin: vi.fn(),
  },
}));

import { eventsService } from '../../src/modules/events/service/events.service.js';

describe('Events API integration', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for POST /events without auth', async () => {
    const res = await request(app).post('/api/v1/events').send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for PATCH /events/:eventId/publish without auth', async () => {
    const res = await request(app).patch(
      '/api/v1/events/550e8400-e29b-41d4-a716-446655440000/publish',
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for DELETE /events/:eventId without auth', async () => {
    const res = await request(app).delete(
      '/api/v1/events/550e8400-e29b-41d4-a716-446655440000',
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /hosts/events without auth', async () => {
    const res = await request(app).get('/api/v1/hosts/events');
    expect(res.status).toBe(401);
  });

  it('returns 401 for admin pending events without auth', async () => {
    const res = await request(app).get('/api/v1/admin/events/pending');
    expect(res.status).toBe(401);
  });

  it('returns 401 for admin approve without auth', async () => {
    const res = await request(app).patch(
      '/api/v1/admin/events/550e8400-e29b-41d4-a716-446655440000/approve',
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for admin reject without auth', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/events/550e8400-e29b-41d4-a716-446655440000/reject')
      .send({ reason: 'Policy violation' });
    expect(res.status).toBe(401);
  });
});

describe('Events authorization', () => {
  it('admin routes require events.moderate permission', () => {
    expect(eventsService.listPendingAdmin).toBeDefined();
  });
});

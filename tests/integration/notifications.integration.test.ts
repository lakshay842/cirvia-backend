import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Notifications API integration', () => {
  const app = createApp();

  it('returns 401 for GET /notifications without auth', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /notifications/:id without auth', async () => {
    const res = await request(app).get(
      '/api/v1/notifications/550e8400-e29b-41d4-a716-446655440000',
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for PATCH /notifications/:id/read without auth', async () => {
    const res = await request(app).patch(
      '/api/v1/notifications/550e8400-e29b-41d4-a716-446655440000/read',
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for PATCH /notifications/read-all without auth', async () => {
    const res = await request(app).patch('/api/v1/notifications/read-all');
    expect(res.status).toBe(401);
  });

  it('returns 401 for DELETE /notifications/:id without auth', async () => {
    const res = await request(app).delete(
      '/api/v1/notifications/550e8400-e29b-41d4-a716-446655440000',
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /notifications/preferences without auth', async () => {
    const res = await request(app).get('/api/v1/notifications/preferences');
    expect(res.status).toBe(401);
  });

  it('returns 401 for PATCH /notifications/preferences without auth', async () => {
    const res = await request(app).patch('/api/v1/notifications/preferences').send({ email: false });
    expect(res.status).toBe(401);
  });
});

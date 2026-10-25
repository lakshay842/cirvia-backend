import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Reviews API integration', () => {
  const app = createApp();

  it('returns 401 for POST /reviews/event without auth', async () => {
    const res = await request(app).post('/api/v1/reviews/event').send({
      bookingId: '550e8400-e29b-41d4-a716-446655440000',
      rating: 5,
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for POST /reviews/host without auth', async () => {
    const res = await request(app).post('/api/v1/reviews/host').send({
      bookingId: '550e8400-e29b-41d4-a716-446655440000',
      rating: 4,
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for PATCH /reviews/:id without auth', async () => {
    const res = await request(app)
      .patch('/api/v1/reviews/550e8400-e29b-41d4-a716-446655440001')
      .send({ type: 'event', rating: 3 });
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /users/me/reviews without auth', async () => {
    const res = await request(app).get('/api/v1/users/me/reviews');
    expect(res.status).toBe(401);
  });

  it('returns 401 for POST /reports/review without auth', async () => {
    const res = await request(app).post('/api/v1/reports/review').send({
      reviewId: '550e8400-e29b-41d4-a716-446655440001',
      type: 'event',
      reason: 'Inappropriate',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /admin/reviews without auth', async () => {
    const res = await request(app).get('/api/v1/admin/reviews');
    expect(res.status).toBe(401);
  });
});

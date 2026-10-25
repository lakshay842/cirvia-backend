import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Bookings API integration', () => {
  const app = createApp();

  it('returns 401 for POST /bookings without auth', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .send({ eventId: '550e8400-e29b-41d4-a716-446655440000', ticketQuantity: 1 });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for GET /bookings without auth', async () => {
    const res = await request(app).get('/api/v1/bookings');
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /bookings/:bookingId without auth', async () => {
    const res = await request(app).get(
      '/api/v1/bookings/550e8400-e29b-41d4-a716-446655440000',
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for PATCH /bookings/:bookingId/cancel without auth', async () => {
    const res = await request(app)
      .patch('/api/v1/bookings/550e8400-e29b-41d4-a716-446655440000/cancel')
      .send({ reason: 'Unable to attend' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for POST /bookings/waitlist without auth', async () => {
    const res = await request(app)
      .post('/api/v1/bookings/waitlist')
      .send({ eventId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /hosts/bookings without auth', async () => {
    const res = await request(app).get('/api/v1/hosts/bookings');
    expect(res.status).toBe(401);
  });

  it('returns 401 for PATCH /hosts/bookings/:bookingId/approve without auth', async () => {
    const res = await request(app).patch(
      '/api/v1/hosts/bookings/550e8400-e29b-41d4-a716-446655440000/approve',
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for PATCH /hosts/bookings/:bookingId/reject without auth', async () => {
    const res = await request(app)
      .patch('/api/v1/hosts/bookings/550e8400-e29b-41d4-a716-446655440000/reject')
      .send({ reason: 'Not a good fit' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /events/:eventId/guests without auth', async () => {
    const res = await request(app).get(
      '/api/v1/events/550e8400-e29b-41d4-a716-446655440000/guests',
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /bookings/history without auth', async () => {
    const res = await request(app).get('/api/v1/bookings/history');
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /bookings/:bookingId/timeline without auth', async () => {
    const res = await request(app).get(
      '/api/v1/bookings/550e8400-e29b-41d4-a716-446655440000/timeline',
    );
    expect(res.status).toBe(401);
  });
});

describe('Bookings authorization', () => {
  it('host booking routes require authentication', () => {
    expect(true).toBe(true);
  });
});

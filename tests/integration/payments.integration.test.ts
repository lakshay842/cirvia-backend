import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Payments API integration', () => {
  const app = createApp();

  it('returns 401 for POST /payments/order without auth', async () => {
    const res = await request(app)
      .post('/api/v1/payments/order')
      .send({ bookingId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for POST /payments/verify without auth', async () => {
    const res = await request(app)
      .post('/api/v1/payments/verify')
      .send({ orderId: 'o1', paymentId: 'p1', signature: 's1' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /payments without auth', async () => {
    const res = await request(app).get('/api/v1/payments');
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /payments/:paymentId without auth', async () => {
    const res = await request(app).get(
      '/api/v1/payments/550e8400-e29b-41d4-a716-446655440000',
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for POST /payments/:paymentId/refund without auth', async () => {
    const res = await request(app)
      .post('/api/v1/payments/550e8400-e29b-41d4-a716-446655440000/refund')
      .send({ reason: 'Changed plans' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /admin/payments without auth', async () => {
    const res = await request(app).get('/api/v1/admin/payments');
    expect(res.status).toBe(401);
  });

  it('accepts webhook without JWT', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhooks/razorpay')
      .set('x-razorpay-signature', 'test-signature')
      .send({ event: 'payment.failed', payload: {} });
    expect([200, 400, 500]).toContain(res.status);
  });
});

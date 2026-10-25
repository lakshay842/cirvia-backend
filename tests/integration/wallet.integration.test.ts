import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Wallet API integration', () => {
  const app = createApp();

  it('returns 401 for GET /wallet without auth', async () => {
    const res = await request(app).get('/api/v1/wallet');
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /wallet/transactions without auth', async () => {
    const res = await request(app).get('/api/v1/wallet/transactions');
    expect(res.status).toBe(401);
  });

  it('returns 401 for POST /wallet/withdraw without auth', async () => {
    const res = await request(app)
      .post('/api/v1/wallet/withdraw')
      .send({
        amount: 5000,
        bankAccountId: '550e8400-e29b-41d4-a716-446655440000',
      });
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /wallet/withdrawals without auth', async () => {
    const res = await request(app).get('/api/v1/wallet/withdrawals');
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /wallet/bank-accounts without auth', async () => {
    const res = await request(app).get('/api/v1/wallet/bank-accounts');
    expect(res.status).toBe(401);
  });

  it('returns 401 for POST /wallet/bank-accounts without auth', async () => {
    const res = await request(app)
      .post('/api/v1/wallet/bank-accounts')
      .send({
        accountHolderName: 'Aarav Sharma',
        bankName: 'HDFC Bank',
        accountNumber: '1234567890',
        ifscCode: 'HDFC0001234',
      });
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /admin/payouts without auth', async () => {
    const res = await request(app).get('/api/v1/admin/payouts');
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /admin/payouts/bank-accounts without auth', async () => {
    const res = await request(app).get('/api/v1/admin/payouts/bank-accounts');
    expect(res.status).toBe(401);
  });

  it('returns 401 for PATCH /admin/payouts/bank-accounts/:id/verify without auth', async () => {
    const res = await request(app).patch(
      '/api/v1/admin/payouts/bank-accounts/550e8400-e29b-41d4-a716-446655440000/verify',
    );
    expect(res.status).toBe(401);
  });
});

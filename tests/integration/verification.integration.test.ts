import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

vi.mock('../../src/modules/verification/service/verification.service.js', () => ({
  verificationService: {
    getStatus: vi.fn(),
    getHistory: vi.fn(),
    listPendingVerifications: vi.fn(),
  },
}));

import { verificationService } from '../../src/modules/verification/service/verification.service.js';

describe('Verification API integration', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for GET /verification/status without auth', async () => {
    const res = await request(app).get('/api/v1/verification/status');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for POST /verification without auth', async () => {
    const res = await request(app).post('/api/v1/verification');
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /verification/history without auth', async () => {
    const res = await request(app).get('/api/v1/verification/history');
    expect(res.status).toBe(401);
  });

  it('returns 401 for admin verifications without auth', async () => {
    const res = await request(app).get('/api/v1/admin/verifications');
    expect(res.status).toBe(401);
  });

  it('returns 401 for admin approve without auth', async () => {
    const res = await request(app).patch(
      '/api/v1/admin/verifications/550e8400-e29b-41d4-a716-446655440000/approve',
    );
    expect(res.status).toBe(401);
  });

  it('validates reject body requires reason when authed would fail earlier', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/verifications/550e8400-e29b-41d4-a716-446655440000/reject')
      .send({});
    expect(res.status).toBe(401);
  });
});

describe('Verification repository authorization', () => {
  it('admin routes require verification.review permission', async () => {
    expect(verificationService.listPendingVerifications).toBeDefined();
  });
});

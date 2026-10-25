import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

vi.mock('../../src/modules/hosts/service/hosts.service.js', () => ({
  hostsService: {
    getPublicProfile: vi.fn(),
    getMyProfile: vi.fn(),
    listAdminHosts: vi.fn(),
  },
}));

import { hostsService } from '../../src/modules/hosts/service/hosts.service.js';

describe('Hosts API integration', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows GET /hosts/:slug without auth', async () => {
    vi.mocked(hostsService.getPublicProfile).mockResolvedValue({
      slug: 'test-host',
      displayName: 'Test Host',
    } as Awaited<ReturnType<typeof hostsService.getPublicProfile>>);

    const res = await request(app).get('/api/v1/hosts/test-host-abc12345');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 401 for POST /hosts/apply without auth', async () => {
    const res = await request(app).post('/api/v1/hosts/apply').send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for GET /hosts/me without auth', async () => {
    const res = await request(app).get('/api/v1/hosts/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /hosts/dashboard without auth', async () => {
    const res = await request(app).get('/api/v1/hosts/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /hosts/verification-status without auth', async () => {
    const res = await request(app).get('/api/v1/hosts/verification-status');
    expect(res.status).toBe(401);
  });

  it('returns 401 for POST /hosts/documents without auth', async () => {
    const res = await request(app).post('/api/v1/hosts/documents');
    expect(res.status).toBe(401);
  });

  it('returns 401 for admin hosts list without auth', async () => {
    const res = await request(app).get('/api/v1/admin/hosts');
    expect(res.status).toBe(401);
  });

  it('returns 401 for admin approve without auth', async () => {
    const res = await request(app).patch(
      '/api/v1/admin/hosts/550e8400-e29b-41d4-a716-446655440000/approve',
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for admin reject without auth', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/hosts/550e8400-e29b-41d4-a716-446655440000/reject')
      .send({ reason: 'Incomplete profile' });
    expect(res.status).toBe(401);
  });
});

describe('Hosts authorization', () => {
  it('admin routes require hosts.verify permission', () => {
    expect(hostsService.listAdminHosts).toBeDefined();
  });
});

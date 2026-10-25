import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { ValidationError } from '../../src/errors/index.js';

vi.mock('../../src/modules/auth/service/auth.service.js', () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    verifyEmail: vi.fn(),
    sendPhoneOtp: vi.fn(),
    listSessions: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

import { authService } from '../../src/modules/auth/service/auth.service.js';

describe('Auth API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/v1/auth/register validates request body', async () => {
    const app = createApp();
    const response = await request(app).post('/api/v1/auth/register').send({
      firstName: 'John',
      email: 'invalid',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('POST /api/v1/auth/register returns success', async () => {
    vi.mocked(authService.register).mockResolvedValue({
      message: 'Registration successful. Please verify your email.',
    });

    const app = createApp();
    const response = await request(app).post('/api/v1/auth/register').send({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '9876543210',
      password: 'SecureP@ss1',
      confirmPassword: 'SecureP@ss1',
      acceptTerms: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(authService.register).toHaveBeenCalledOnce();
  });

  it('POST /api/v1/auth/login validates email format', async () => {
    const app = createApp();
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'bad-email',
      password: 'test',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/users/me returns 401 without token', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/users/me');
    expect(response.status).toBe(401);
  });

  it('POST /api/v1/auth/verify-email validates token', async () => {
    const app = createApp();
    const response = await request(app).post('/api/v1/auth/verify-email').send({});
    expect(response.status).toBe(400);
  });

  it('GET /api-docs serves swagger UI', async () => {
    const app = createApp();
    const response = await request(app).get('/api-docs/');
    expect(response.status).toBe(200);
  });

  it('POST /api/v1/auth/register propagates service errors', async () => {
    vi.mocked(authService.register).mockRejectedValue(
      new ValidationError('Disposable email addresses are not allowed.', { field: 'email' }),
    );

    const app = createApp();
    const response = await request(app).post('/api/v1/auth/register').send({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '9876543210',
      password: 'SecureP@ss1',
      confirmPassword: 'SecureP@ss1',
      acceptTerms: true,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

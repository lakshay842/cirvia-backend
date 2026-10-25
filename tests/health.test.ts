import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetConfigForTesting } from '../src/config/index.js';
import { resetLoggerForTesting } from '../src/logger/index.js';

describe('Health Endpoints', () => {
  beforeEach(() => {
    resetConfigForTesting();
    resetLoggerForTesting();
  });

  it('GET /live returns alive status', async () => {
    const app = createApp();
    const response = await request(app).get('/live');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.alive).toBe(true);
    expect(response.body.data.version).toBe('1.0.0-test');
  });

  it('GET /health returns service health', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.services.database.status).toBe('up');
    expect(response.body.data.services.redis.status).toBe('up');
  });

  it('GET /ready returns readiness status', async () => {
    const app = createApp();
    const response = await request(app).get('/ready');

    expect(response.status).toBe(200);
    expect(response.body.data.ready).toBe(true);
  });

  it('GET / returns API info', async () => {
    const app = createApp();
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.data.apiPrefix).toBe('/api/v1');
  });

  it('GET /api/v1 returns API version info', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1');

    expect(response.status).toBe(200);
    expect(response.body.data.version).toBe('1.1.0');
  });

  it('returns 404 for unknown routes', async () => {
    const app = createApp();
    const response = await request(app).get('/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('includes request ID header', async () => {
    const app = createApp();
    const response = await request(app).get('/live');

    expect(response.headers['x-request-id']).toBeDefined();
  });
});

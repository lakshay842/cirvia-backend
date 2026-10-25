import { op } from './common.openapi.js';

export const healthOpenApiPaths = {
  '/health': { get: op('Health check', { tags: ['Health'] }) },
  '/ready': { get: op('Readiness probe', { tags: ['Health'] }) },
  '/live': { get: op('Liveness probe', { tags: ['Health'] }) },
  '/api/v1': { get: op('API v1 metadata', { tags: ['Meta'] }) },
} as const;

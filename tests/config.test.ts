import { describe, it, expect } from 'vitest';
import { loadEnvConfig } from '../src/config/env.js';
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  BaseError,
} from '../src/errors/index.js';

describe('Environment Configuration', () => {
  it('loads valid test environment', () => {
    const config = loadEnvConfig(process.env);
    expect(config.NODE_ENV).toBe('test');
    expect(config.PORT).toBe(3000);
    expect(config.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it('fails fast on invalid configuration', () => {
    expect(() =>
      loadEnvConfig({
        NODE_ENV: 'development',
        PORT: 'invalid',
      }),
    ).toThrow('Invalid environment configuration');
  });

  it('fails when JWT secret is too short', () => {
    expect(() =>
      loadEnvConfig({
        ...process.env,
        JWT_SECRET: 'short',
      }),
    ).toThrow('Invalid environment configuration');
  });
});

describe('Error Classes', () => {
  it('creates ValidationError with correct status', () => {
    const error = new ValidationError('Invalid email', { field: 'email' });
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.field).toBe('email');
    expect(error.isOperational).toBe(true);
  });

  it('creates UnauthorizedError', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
  });

  it('creates NotFoundError', () => {
    const error = new NotFoundError('User not found');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('User not found');
  });

  it('serializes BaseError to JSON', () => {
    const error = new BaseError('Test', 500, 'TEST_ERROR', {
      details: { key: 'value' },
    });
    expect(error.toJSON()).toEqual({
      code: 'TEST_ERROR',
      details: { key: 'value' },
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePasswordStrength } from '../src/utils/password.util.js';
import { normalizeEmail, normalizePhone } from '../src/utils/sanitize.util.js';
import { ValidationError } from '../src/errors/index.js';
import {
  requireRole,
  requirePermission,
  requireAdmin,
} from '../src/middleware/authorize.middleware.js';
import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedUser } from '../src/modules/auth/types/auth.types.js';
import { AccountStatus, AuthProvider } from '@prisma/client';

describe('Password validation', () => {
  it('rejects weak passwords', () => {
    expect(() => validatePasswordStrength('short')).toThrow(ValidationError);
  });

  it('rejects passwords missing complexity', () => {
    expect(() => validatePasswordStrength('alllowercase')).toThrow(ValidationError);
  });

  it('accepts strong passwords', () => {
    expect(() => validatePasswordStrength('SecureP@ss1')).not.toThrow();
  });
});

describe('Sanitization', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  Test@Example.COM ')).toBe('test@example.com');
  });

  it('normalizes Indian phone numbers', () => {
    expect(normalizePhone('9876543210')).toBe('+919876543210');
  });
});

describe('Authorization middleware', () => {
  const mockRes = {} as Response;
  const mockNext = vi.fn() as NextFunction;

  const baseUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@example.com',
    phone: null,
    emailVerified: true,
    phoneVerified: false,
    accountStatus: AccountStatus.ACTIVE,
    provider: AuthProvider.EMAIL,
    roles: ['USER'],
    permissions: ['events.create'],
    sessionId: 'session-1',
  };

  beforeEach(() => {
    mockNext.mockClear();
  });

  it('requireRole allows matching role', () => {
    const req = { user: baseUser } as Request;
    requireRole('USER')(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('requireRole rejects missing role', () => {
    const req = { user: baseUser } as Request;
    requireRole('ADMIN')(req, mockRes, mockNext);
    expect(mockNext.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('requirePermission checks permissions', () => {
    const req = { user: baseUser } as Request;
    requirePermission('events.create')(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('requireAdmin rejects non-admin', () => {
    const req = { user: baseUser } as Request;
    requireAdmin(req, mockRes, mockNext);
    expect(mockNext.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('requireAdmin allows super admin', () => {
    const req = {
      user: { ...baseUser, roles: ['SUPER_ADMIN'] },
    } as Request;
    requireAdmin(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });
});

describe('Auth schema validation', () => {
  it('register schema requires acceptTerms', async () => {
    const { registerSchema } = await import('../src/modules/auth/schemas/auth.schema.js');
    const result = registerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '9876543210',
      password: 'SecureP@ss1',
      confirmPassword: 'SecureP@ss1',
      acceptTerms: false,
    });
    expect(result.success).toBe(false);
  });

  it('login schema validates email', async () => {
    const { loginSchema } = await import('../src/modules/auth/schemas/auth.schema.js');
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'test',
    });
    expect(result.success).toBe(false);
  });
});

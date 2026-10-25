import { bearerSecurity, jsonBody, op, openApiSchemas } from './common.openapi.js';

const tag = ['Auth'];

export const authOpenApiPaths = {
  '/api/v1/auth/register': {
    post: op('Register a new user', {
      tags: tag,
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword', 'acceptTerms'],
          properties: {
            firstName: { type: 'string', example: 'Aarav' },
            lastName: { type: 'string', example: 'Sharma' },
            email: { type: 'string', format: 'email', example: 'aarav@example.com' },
            phone: { type: 'string', example: '+919876543210' },
            password: { type: 'string', minLength: 8 },
            confirmPassword: { type: 'string' },
            acceptTerms: { type: 'boolean', example: true },
          },
        },
        { firstName: 'Aarav', lastName: 'Sharma', email: 'aarav@example.com', phone: '+919876543210', password: 'SecurePass1!', confirmPassword: 'SecurePass1!', acceptTerms: true },
      ),
      responses: { '201': { description: 'Registration successful' }, '409': { description: 'Email or phone exists' } },
    }),
  },
  '/api/v1/auth/login': {
    post: op('Login with email and password', {
      tags: tag,
      requestBody: jsonBody(
        { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' }, rememberMe: { type: 'boolean' } } },
        { email: 'aarav@example.com', password: 'SecurePass1!' },
      ),
    }),
  },
  '/api/v1/auth/login-phone': {
    post: op('Login with phone OTP', {
      tags: tag,
      requestBody: jsonBody(
        { type: 'object', required: ['phone', 'otp'], properties: { phone: { type: 'string' }, otp: { type: 'string' } } },
        { phone: '+919876543210', otp: '123456' },
      ),
    }),
  },
  '/api/v1/auth/google': {
    post: op('Login with Google', {
      tags: tag,
      requestBody: jsonBody(
        { type: 'object', required: ['idToken'], properties: { idToken: { type: 'string' } } },
      ),
    }),
  },
  '/api/v1/auth/refresh': {
    post: op('Refresh access token', {
      tags: tag,
      requestBody: jsonBody(
        { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
      ),
    }),
  },
  '/api/v1/auth/logout': { post: op('Logout current session', { tags: tag }) },
  '/api/v1/auth/forgot-password': {
    post: op('Request password reset', {
      tags: tag,
      requestBody: jsonBody(
        { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } },
        { email: 'aarav@example.com' },
      ),
    }),
  },
  '/api/v1/auth/reset-password': {
    post: op('Reset password with token', {
      tags: tag,
      requestBody: jsonBody(
        { type: 'object', required: ['token', 'password', 'confirmPassword'], properties: { token: { type: 'string' }, password: { type: 'string' }, confirmPassword: { type: 'string' } } },
      ),
    }),
  },
  '/api/v1/auth/verify-email': {
    post: op('Verify email with token', {
      tags: tag,
      requestBody: jsonBody(
        { type: 'object', required: ['token'], properties: { token: { type: 'string' } } },
      ),
    }),
  },
  '/api/v1/auth/send-phone-otp': {
    post: op('Send phone OTP', {
      tags: tag,
      requestBody: jsonBody(
        { type: 'object', required: ['phone'], properties: { phone: { type: 'string' } } },
        { phone: '+919876543210' },
      ),
    }),
  },
  '/api/v1/auth/send-email-verification': {
    post: op('Resend email verification', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/auth/verify-phone-otp': {
    post: op('Verify phone OTP', {
      tags: tag,
      security: bearerSecurity,
      requestBody: jsonBody(
        { type: 'object', required: ['otp'], properties: { otp: { type: 'string' } } },
        { otp: '123456' },
      ),
    }),
  },
  '/api/v1/auth/change-password': {
    post: op('Change password', {
      tags: tag,
      security: bearerSecurity,
      requestBody: jsonBody(
        { type: 'object', required: ['currentPassword', 'newPassword', 'confirmPassword'], properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' }, confirmPassword: { type: 'string' } } },
      ),
    }),
  },
  '/api/v1/auth/logout-all': { post: op('Logout all sessions', { tags: tag, security: bearerSecurity }) },
  '/api/v1/auth/sessions': { get: op('List active sessions', { tags: tag, security: bearerSecurity }) },
  '/api/v1/auth/sessions/{sessionId}': {
    delete: op('Revoke session', {
      tags: tag,
      security: bearerSecurity,
      parameters: [{ name: 'sessionId', in: 'path', required: true, schema: openApiSchemas.UuidParam }],
    }),
  },
  '/api/v1/auth/account': {
    delete: op('Delete account', {
      tags: tag,
      security: bearerSecurity,
      requestBody: jsonBody(
        { type: 'object', required: ['password', 'confirmDeletion'], properties: { password: { type: 'string' }, confirmDeletion: { type: 'boolean' } } },
        { password: 'SecurePass1!', confirmDeletion: true },
      ),
    }),
  },
} as const;

import { bearerSecurity, op } from './common.openapi.js';

const tag = ['Admin Analytics'];
const periodParams = [
  { name: 'period', in: 'query' as const, schema: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] } },
  { name: 'from', in: 'query' as const, schema: { type: 'string', format: 'date-time' } },
  { name: 'to', in: 'query' as const, schema: { type: 'string', format: 'date-time' } },
];

export const analyticsOpenApiPaths = {
  '/api/v1/admin/analytics/dashboard': {
    get: op('Platform dashboard metrics', { tags: tag, security: bearerSecurity, parameters: periodParams }),
  },
  '/api/v1/admin/analytics/revenue': {
    get: op('Revenue analytics', { tags: tag, security: bearerSecurity, parameters: periodParams }),
  },
  '/api/v1/admin/analytics/users': {
    get: op('User growth analytics', { tags: tag, security: bearerSecurity, parameters: periodParams }),
  },
  '/api/v1/admin/analytics/hosts': {
    get: op('Host growth analytics', { tags: tag, security: bearerSecurity, parameters: periodParams }),
  },
  '/api/v1/admin/analytics/bookings': {
    get: op('Booking analytics', { tags: tag, security: bearerSecurity, parameters: periodParams }),
  },
  '/api/v1/admin/analytics/events': {
    get: op('Event analytics', { tags: tag, security: bearerSecurity, parameters: periodParams }),
  },
  '/api/v1/admin/analytics/trust': {
    get: op('Trust score analytics', { tags: tag, security: bearerSecurity, parameters: periodParams }),
  },
  '/api/v1/admin/analytics/reports': {
    get: op('Report analytics', { tags: tag, security: bearerSecurity, parameters: periodParams }),
  },
  '/api/v1/admin/export': {
    get: op('Export analytics CSV', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'module', in: 'query' as const, required: true, schema: { type: 'string' } },
        { name: 'from', in: 'query' as const, schema: { type: 'string' } },
        { name: 'to', in: 'query' as const, schema: { type: 'string' } },
        { name: 'format', in: 'query' as const, schema: { type: 'string', enum: ['csv', 'excel', 'pdf'] } },
      ],
    }),
  },
  '/api/v1/admin/dashboard': {
    get: op('Admin dashboard summary', { tags: ['Admin Dashboard'], security: bearerSecurity, parameters: periodParams }),
  },
};

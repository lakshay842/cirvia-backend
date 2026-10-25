import { bearerSecurity, jsonBody, op } from './common.openapi.js';

const tag = ['Reports'];
const adminTag = ['Admin Reports'];

const reportIdParam = {
  name: 'reportId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string', format: 'uuid' },
};

const reportBody = {
  type: 'object',
  required: ['reason'],
  properties: {
    reason: {
      type: 'string',
      enum: ['Spam', 'Harassment', 'Violence', 'Fake Profile', 'Scam', 'NSFW', 'Other'],
    },
    description: { type: 'string' },
  },
};

export const reportsOpenApiPaths = {
  '/api/v1/reports/user': {
    post: op('Report a user', { tags: tag, security: bearerSecurity, requestBody: jsonBody({ ...reportBody, required: ['userId', 'reason'], properties: { ...reportBody.properties, userId: { type: 'string', format: 'uuid' } } }) }),
  },
  '/api/v1/reports/host': {
    post: op('Report a host', { tags: tag, security: bearerSecurity, requestBody: jsonBody({ ...reportBody, required: ['hostId', 'reason'], properties: { ...reportBody.properties, hostId: { type: 'string', format: 'uuid' } } }) }),
  },
  '/api/v1/reports/event': {
    post: op('Report an event', { tags: tag, security: bearerSecurity, requestBody: jsonBody({ ...reportBody, required: ['eventId', 'reason'], properties: { ...reportBody.properties, eventId: { type: 'string', format: 'uuid' } } }) }),
  },
  '/api/v1/reports/booking': {
    post: op('Report a booking', { tags: tag, security: bearerSecurity, requestBody: jsonBody({ ...reportBody, required: ['bookingId', 'reason'], properties: { ...reportBody.properties, bookingId: { type: 'string', format: 'uuid' } } }) }),
  },
  '/api/v1/reports/review': {
    post: op('Report a review', {
      tags: tag,
      security: bearerSecurity,
      requestBody: jsonBody({
        ...reportBody,
        required: ['reviewId', 'type', 'reason'],
        properties: {
          ...reportBody.properties,
          reviewId: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['event', 'host', 'guest'] },
        },
      }),
    }),
  },
  '/api/v1/reports': {
    get: op('List my reports', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
      ],
    }),
  },
  '/api/v1/reports/{reportId}': {
    get: op('Get report status', { tags: tag, security: bearerSecurity, parameters: [reportIdParam] }),
  },
  '/api/v1/reports/{reportId}/timeline': {
    get: op('Get report timeline', { tags: tag, security: bearerSecurity, parameters: [reportIdParam] }),
  },
  '/api/v1/reports/{reportId}/attachments': {
    post: op('Upload report evidence', { tags: tag, security: bearerSecurity, parameters: [reportIdParam] }),
  },
  '/api/v1/admin/reports': {
    get: op('Admin report queue', {
      tags: adminTag,
      security: bearerSecurity,
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'priority', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
      ],
    }),
  },
  '/api/v1/admin/reports/{reportId}': {
    get: op('Admin report details', { tags: adminTag, security: bearerSecurity, parameters: [reportIdParam] }),
  },
  '/api/v1/admin/reports/{reportId}/timeline': {
    get: op('Admin report timeline', { tags: adminTag, security: bearerSecurity, parameters: [reportIdParam] }),
  },
  '/api/v1/admin/reports/{reportId}/assign': {
    patch: op('Assign moderator', { tags: adminTag, security: bearerSecurity, parameters: [reportIdParam] }),
  },
  '/api/v1/admin/reports/{reportId}/notes': {
    post: op('Add investigation note', { tags: adminTag, security: bearerSecurity, parameters: [reportIdParam] }),
  },
  '/api/v1/admin/reports/{reportId}/resolve': {
    patch: op('Resolve report', { tags: adminTag, security: bearerSecurity, parameters: [reportIdParam] }),
  },
  '/api/v1/admin/reports/{reportId}/dismiss': {
    patch: op('Dismiss report', { tags: adminTag, security: bearerSecurity, parameters: [reportIdParam] }),
  },
  '/api/v1/admin/reports/{reportId}/close': {
    patch: op('Close report', { tags: adminTag, security: bearerSecurity, parameters: [reportIdParam] }),
  },
};

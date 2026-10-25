import { bearerSecurity, jsonBody, op } from './common.openapi.js';

const tag = ['Notifications'];

export const notificationsOpenApiPaths = {
  '/api/v1/notifications': {
    get: op('List notifications', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'unreadOnly', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
      ],
    }),
  },
  '/api/v1/notifications/read-all': {
    patch: op('Mark all notifications as read', {
      tags: tag,
      security: bearerSecurity,
    }),
  },
  '/api/v1/notifications/preferences': {
    get: op('Get notification preferences', { tags: tag, security: bearerSecurity }),
    patch: op('Update notification preferences', {
      tags: tag,
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        properties: {
          email: { type: 'boolean' },
          push: { type: 'boolean' },
          sms: { type: 'boolean' },
          marketing: { type: 'boolean' },
          security: { type: 'boolean' },
          booking: { type: 'boolean' },
          review: { type: 'boolean' },
        },
      }),
    }),
  },
  '/api/v1/notifications/{notificationId}': {
    get: op('Notification details', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'notificationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
    }),
    delete: op('Delete notification', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'notificationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
    }),
  },
  '/api/v1/notifications/{notificationId}/read': {
    patch: op('Mark notification as read', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'notificationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
    }),
  },
};

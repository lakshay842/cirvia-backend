import { bearerSecurity, op } from './common.openapi.js';

const tag = ['Events'];
const hostTag = ['Hosts'];

const eventListResponse = {
  '200': {
    description: 'Event list — each item includes public-safe eventId (UUID) and slug',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/EventListItem' },
                },
              },
            },
            meta: { type: 'object' },
          },
        },
      },
    },
  },
};

const eventDetailResponse = {
  '200': {
    description: 'Event detail — includes public-safe eventId (UUID) and slug',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                event: { $ref: '#/components/schemas/EventPublic' },
              },
            },
            meta: { type: 'object' },
          },
        },
      },
    },
  },
};

export const eventsOpenApiPaths = {
  '/api/v1/events': {
    get: op('List public events', {
      tags: tag,
      responses: eventListResponse,
    }),
    post: op('Create event', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/featured': {
    get: op('Get featured events', { tags: tag, responses: eventListResponse }),
  },
  '/api/v1/events/trending': {
    get: op('Get trending events', { tags: tag, responses: eventListResponse }),
  },
  '/api/v1/events/nearby': {
    get: op('Get nearby events', { tags: tag, responses: eventListResponse }),
  },
  '/api/v1/events/search': {
    get: op('Search events', { tags: tag, responses: eventListResponse }),
  },
  '/api/v1/events/upcoming': {
    get: op('Get upcoming events', { tags: tag, responses: eventListResponse }),
  },
  '/api/v1/events/past': {
    get: op('Get past events', { tags: tag, responses: eventListResponse }),
  },
  '/api/v1/events/{slug}': {
    get: op('Get event by slug (public)', {
      tags: tag,
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: eventDetailResponse,
    }),
  },
  '/api/v1/events/{eventId}': {
    patch: op('Update event', { tags: tag, security: bearerSecurity }),
    delete: op('Soft delete event', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/publish': {
    patch: op('Publish event', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/unpublish': {
    patch: op('Unpublish event', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/cancel': {
    patch: op('Cancel event', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/archive': {
    patch: op('Archive event', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/duplicate': {
    post: op('Duplicate event', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/location': {
    get: op('Get event location', { tags: tag, security: bearerSecurity }),
    patch: op('Update event location', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/media': {
    post: op('Upload event media', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/media/{mediaId}': {
    delete: op('Delete event media', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/hosts/events': {
    get: op('List host events', {
      tags: hostTag,
      security: bearerSecurity,
      responses: eventListResponse,
    }),
  },
  '/api/v1/hosts/events/{eventId}/analytics': {
    get: op('Event analytics placeholder', { tags: hostTag, security: bearerSecurity }),
  },
  '/api/v1/categories': {
    get: op('List categories', { tags: ['Categories'] }),
  },
  '/api/v1/categories/{slug}': {
    get: op('Get category by slug', { tags: ['Categories'] }),
  },
  '/api/v1/admin/events/pending': {
    get: op('List pending events', { tags: ['Admin Events'], security: bearerSecurity }),
  },
  '/api/v1/admin/events/{eventId}/approve': {
    patch: op('Approve event', { tags: ['Admin Events'], security: bearerSecurity }),
  },
  '/api/v1/admin/events/{eventId}/reject': {
    patch: op('Reject event', { tags: ['Admin Events'], security: bearerSecurity }),
  },
  '/api/v1/admin/events/{eventId}/feature': {
    patch: op('Feature event', { tags: ['Admin Events'], security: bearerSecurity }),
  },
  '/api/v1/admin/events/{eventId}/unfeature': {
    patch: op('Unfeature event', { tags: ['Admin Events'], security: bearerSecurity }),
  },
  '/api/v1/admin/events/{eventId}/suspend': {
    patch: op('Suspend event', { tags: ['Admin Events'], security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/restore': {
    patch: op('Restore suspended event', { tags: ['Admin Events'], security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/rules': {
    post: op('Add event rule', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/rules/{ruleId}': {
    delete: op('Delete event rule', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/tags': {
    post: op('Add event tags', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/tags/{tagId}': {
    delete: op('Remove event tag', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/media/order': {
    patch: op('Reorder event media', { tags: tag, security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/guests': {
    get: op('Event guest list (host)', { tags: ['Bookings'], security: bearerSecurity }),
  },
  '/api/v1/events/{eventId}/attendance': {
    get: op('Attendance placeholder (host)', { tags: ['Bookings'], security: bearerSecurity }),
  },
  '/api/v1/admin/events/{eventId}': {
    get: op('Get event for moderation', { tags: ['Admin Events'], security: bearerSecurity }),
  },
};

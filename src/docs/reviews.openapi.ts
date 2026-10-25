import { bearerSecurity, jsonBody, op } from './common.openapi.js';

const tag = ['Reviews'];
const reviewIdParam = {
  name: 'reviewId',
  in: 'path' as const,
  required: true,
  schema: { type: 'string', format: 'uuid' },
};
const reviewTypeQuery = {
  name: 'type',
  in: 'query' as const,
  required: true,
  schema: { type: 'string', enum: ['event', 'host', 'guest'] },
};
const listQueryParams = [
  { name: 'page', in: 'query' as const, schema: { type: 'integer' } },
  { name: 'limit', in: 'query' as const, schema: { type: 'integer' } },
  { name: 'rating', in: 'query' as const, schema: { type: 'integer', minimum: 1, maximum: 5 } },
  {
    name: 'sort',
    in: 'query' as const,
    schema: { type: 'string', enum: ['latest', 'oldest', 'highest', 'lowest', 'helpful'] },
  },
];

const reviewBody = {
  type: 'object',
  required: ['bookingId', 'rating'],
  properties: {
    bookingId: { type: 'string', format: 'uuid' },
    rating: { type: 'integer', minimum: 1, maximum: 5 },
    title: { type: 'string' },
    comment: { type: 'string' },
    wouldRecommend: { type: 'boolean' },
    mediaUrls: { type: 'array', items: { type: 'string', format: 'uri' } },
  },
};

export const reviewsOpenApiPaths = {
  '/api/v1/reviews/event': {
    post: op('Submit event review', {
      tags: tag,
      security: bearerSecurity,
      requestBody: jsonBody(reviewBody),
    }),
  },
  '/api/v1/reviews/host': {
    post: op('Submit host review', {
      tags: tag,
      security: bearerSecurity,
      requestBody: jsonBody(reviewBody),
    }),
  },
  '/api/v1/reviews/guest': {
    post: op('Submit guest review (host only)', {
      tags: tag,
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        required: ['bookingId', 'rating'],
        properties: {
          bookingId: { type: 'string', format: 'uuid' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string' },
          mediaUrls: { type: 'array', items: { type: 'string', format: 'uri' } },
        },
      }),
    }),
  },
  '/api/v1/reviews/{reviewId}': {
    patch: op('Update review', {
      tags: tag,
      security: bearerSecurity,
      parameters: [reviewIdParam],
      requestBody: jsonBody({
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['event', 'host', 'guest'] },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          title: { type: 'string' },
          comment: { type: 'string' },
          wouldRecommend: { type: 'boolean' },
        },
      }),
    }),
    delete: op('Delete review', {
      tags: tag,
      security: bearerSecurity,
      parameters: [reviewIdParam, reviewTypeQuery],
    }),
  },
  '/api/v1/reviews/{reviewId}/reply': {
    post: op('Host reply to review', {
      tags: tag,
      security: bearerSecurity,
      parameters: [reviewIdParam],
      requestBody: jsonBody({
        type: 'object',
        required: ['type', 'comment'],
        properties: {
          type: { type: 'string', enum: ['event', 'host'] },
          comment: { type: 'string' },
        },
      }),
    }),
  },
  '/api/v1/reviews/{reviewId}/helpful': {
    post: op('Mark review helpful', {
      tags: tag,
      security: bearerSecurity,
      parameters: [reviewIdParam, reviewTypeQuery],
    }),
    delete: op('Remove helpful vote', {
      tags: tag,
      security: bearerSecurity,
      parameters: [reviewIdParam, reviewTypeQuery],
    }),
  },
  '/api/v1/reviews/{reviewId}/report': {
    post: op('Report review', {
      tags: tag,
      security: bearerSecurity,
      parameters: [reviewIdParam],
      requestBody: jsonBody({
        type: 'object',
        required: ['type', 'reason'],
        properties: {
          type: { type: 'string', enum: ['event', 'host', 'guest'] },
          reason: { type: 'string' },
          description: { type: 'string' },
        },
      }),
    }),
  },
  '/api/v1/reports/review': {
    post: op('Report review (contract alias)', {
      tags: tag,
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        required: ['reviewId', 'type', 'reason'],
        properties: {
          reviewId: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['event', 'host', 'guest'] },
          reason: { type: 'string' },
          description: { type: 'string' },
        },
      }),
    }),
  },
  '/api/v1/users/me/reviews': {
    get: op('List my reviews', {
      tags: tag,
      security: bearerSecurity,
      parameters: listQueryParams,
    }),
  },
  '/api/v1/events/{eventId}/reviews': {
    get: op('List event reviews (public)', {
      tags: tag,
      parameters: [
        { name: 'eventId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ...listQueryParams,
      ],
    }),
  },
  '/api/v1/hosts/{hostId}/reviews': {
    get: op('List host reviews (public)', {
      tags: tag,
      parameters: [
        { name: 'hostId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ...listQueryParams,
      ],
    }),
  },
  '/api/v1/admin/reviews': {
    get: op('Admin list reviews', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'hidden', 'all'] },
        },
        {
          name: 'type',
          in: 'query',
          schema: { type: 'string', enum: ['event', 'host', 'guest', 'all'] },
        },
      ],
    }),
  },
  '/api/v1/admin/reviews/{reviewId}/moderate': {
    patch: op('Moderate review', {
      tags: tag,
      security: bearerSecurity,
      parameters: [reviewIdParam],
      requestBody: jsonBody({
        type: 'object',
        required: ['type', 'action'],
        properties: {
          type: { type: 'string', enum: ['event', 'host', 'guest'] },
          action: { type: 'string', enum: ['approve', 'reject', 'hide'] },
          reason: { type: 'string' },
        },
      }),
    }),
  },
};

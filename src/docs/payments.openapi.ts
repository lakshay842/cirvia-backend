import { bearerSecurity, jsonBody, op } from './common.openapi.js';

const tag = ['Payments'];

export const paymentsOpenApiPaths = {
  '/api/v1/payments/order': {
    post: op('Create payment order', {
      tags: tag,
      security: bearerSecurity,
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['bookingId'],
          properties: { bookingId: { type: 'string', format: 'uuid' } },
        },
        { bookingId: '550e8400-e29b-41d4-a716-446655440000' },
      ),
      responses: {
        '201': {
          description: 'Payment order created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiSuccessResponse' },
              example: {
                success: true,
                message: 'Payment order created.',
                data: { orderId: 'order_xxx', amount: 999, currency: 'INR', gateway: 'razorpay' },
              },
            },
          },
        },
      },
    }),
  },
  '/api/v1/payments/verify': {
    post: op('Verify payment', {
      tags: tag,
      security: bearerSecurity,
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['orderId', 'paymentId', 'signature'],
          properties: {
            orderId: { type: 'string' },
            paymentId: { type: 'string' },
            signature: { type: 'string' },
          },
        },
        { orderId: 'order_xxx', paymentId: 'pay_xxx', signature: 'sig_xxx' },
      ),
    }),
  },
  '/api/v1/payments': {
    get: op('Payment history', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
      ],
    }),
  },
  '/api/v1/payments/{paymentId}': {
    get: op('Payment details', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'paymentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
    }),
  },
  '/api/v1/payments/{paymentId}/status': {
    get: op('Payment status', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'paymentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
    }),
  },
  '/api/v1/payments/{paymentId}/invoice': {
    get: op('Download invoice placeholder', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'paymentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
    }),
  },
  '/api/v1/payments/{paymentId}/refund': {
    post: op('Request refund', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'paymentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['reason'],
          properties: { reason: { type: 'string', minLength: 5 } },
        },
        { reason: 'Host cancelled event' },
      ),
    }),
  },
  '/api/v1/payments/{paymentId}/refund-status': {
    get: op('Refund status', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'paymentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
    }),
  },
  '/api/v1/payments/webhooks/razorpay': {
    post: {
      tags: tag,
      summary: 'Razorpay webhook',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: {
        '200': { description: 'Webhook processed' },
        '400': { description: 'Invalid signature' },
      },
    },
  },
  '/api/v1/admin/payments': {
    get: op('Admin payment list', {
      tags: ['Admin', 'Payments'],
      security: bearerSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
      ],
    }),
  },
  '/api/v1/admin/payments/{paymentId}': {
    get: op('Admin payment details', {
      tags: ['Admin', 'Payments'],
      security: bearerSecurity,
      parameters: [
        { name: 'paymentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
    }),
  },
  '/api/v1/admin/payments/{paymentId}/refund': {
    post: op('Admin process refund', {
      tags: ['Admin', 'Payments'],
      security: bearerSecurity,
      parameters: [
        { name: 'paymentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: jsonBody(
        {
          type: 'object',
          properties: {
            reason: { type: 'string' },
            approve: { type: 'boolean', default: true },
          },
        },
      ),
    }),
  },
};

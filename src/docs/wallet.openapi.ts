import { bearerSecurity, jsonBody, op } from './common.openapi.js';

const tag = ['Wallet'];

export const walletOpenApiPaths = {
  '/api/v1/wallet': {
    get: op('Wallet summary', {
      tags: tag,
      security: bearerSecurity,
    }),
  },
  '/api/v1/wallet/transactions': {
    get: op('Wallet transactions', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
      ],
    }),
  },
  '/api/v1/wallet/withdraw': {
    post: op('Request withdrawal', {
      tags: tag,
      security: bearerSecurity,
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['amount', 'bankAccountId'],
          properties: {
            amount: { type: 'number', example: 5000 },
            bankAccountId: { type: 'string', format: 'uuid' },
          },
        },
        { amount: 5000, bankAccountId: '550e8400-e29b-41d4-a716-446655440000' },
      ),
    }),
  },
  '/api/v1/wallet/withdrawals': {
    get: op('Withdrawal history', {
      tags: tag,
      security: bearerSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
      ],
    }),
  },
  '/api/v1/wallet/bank-accounts': {
    get: op('List bank accounts', { tags: tag, security: bearerSecurity }),
    post: op('Add bank account', {
      tags: tag,
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        required: ['accountHolderName', 'bankName', 'accountNumber', 'ifscCode'],
        properties: {
          accountHolderName: { type: 'string' },
          bankName: { type: 'string' },
          accountNumber: { type: 'string' },
          ifscCode: { type: 'string' },
          upiId: { type: 'string' },
          isPrimary: { type: 'boolean' },
        },
      }),
    }),
  },
  '/api/v1/wallet/bank-accounts/{id}': {
    patch: op('Update bank account', {
      tags: tag,
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
    }),
    delete: op('Delete bank account', {
      tags: tag,
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
    }),
  },
  '/api/v1/admin/payouts': {
    get: op('Admin payout list', {
      tags: ['Admin', 'Wallet'],
      security: bearerSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
      ],
    }),
  },
  '/api/v1/admin/payouts/bank-accounts': {
    get: op('Admin bank account verification queue', {
      tags: ['Admin', 'Wallet'],
      security: bearerSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'all'] } },
      ],
    }),
  },
  '/api/v1/admin/payouts/bank-accounts/{id}/verify': {
    patch: op('Verify host bank account', {
      tags: ['Admin', 'Wallet'],
      security: bearerSecurity,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
    }),
  },
  '/api/v1/admin/payouts/bank-accounts/{id}/reject': {
    patch: op('Reject host bank account', {
      tags: ['Admin', 'Wallet'],
      security: bearerSecurity,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: jsonBody({
        type: 'object',
        properties: { reason: { type: 'string' } },
      }),
    }),
  },
  '/api/v1/admin/payouts/{payoutId}/approve': {
    patch: op('Approve payout', {
      tags: ['Admin', 'Wallet'],
      security: bearerSecurity,
      parameters: [
        { name: 'payoutId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
    }),
  },
  '/api/v1/admin/payouts/{payoutId}/reject': {
    patch: op('Reject payout', {
      tags: ['Admin', 'Wallet'],
      security: bearerSecurity,
      parameters: [
        { name: 'payoutId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: jsonBody({
        type: 'object',
        properties: { reason: { type: 'string' } },
      }),
    }),
  },
};

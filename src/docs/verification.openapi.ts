export const verificationOpenApiPaths = {
  '/api/v1/verification': {
    post: {
      tags: ['Verification'],
      summary: 'Submit KYC verification',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['verificationType', 'governmentId', 'selfie'],
              properties: {
                verificationType: {
                  type: 'string',
                  enum: ['AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'PAN_CARD', 'INTERNATIONAL_ID'],
                },
                documentNumber: { type: 'string' },
                expiryDate: { type: 'string', format: 'date' },
                governmentId: { type: 'string', format: 'binary' },
                governmentIdBack: { type: 'string', format: 'binary' },
                selfie: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Verification submitted' },
        '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '409': { description: 'Active verification exists' },
      },
    },
  },
  '/api/v1/verification/status': {
    get: {
      tags: ['Verification'],
      summary: 'Get verification status',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Status retrieved' }, '401': { description: 'Unauthorized' } },
    },
  },
  '/api/v1/verification/details': {
    get: {
      tags: ['Verification'],
      summary: 'Get current verification details',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Details with signed URLs' }, '404': { description: 'Not found' } },
    },
  },
  '/api/v1/verification/{verificationId}': {
    get: {
      tags: ['Verification'],
      summary: 'Get verification details by ID',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'verificationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Details retrieved' }, '404': { description: 'Not found' } },
    },
  },
  '/api/v1/verification/resubmit': {
    post: {
      tags: ['Verification'],
      summary: 'Resubmit verification',
      security: [{ bearerAuth: [] }],
      responses: { '201': { description: 'Resubmitted' }, '403': { description: 'Cannot resubmit' } },
    },
  },
  '/api/v1/verification/{verificationId}/cancel': {
    post: {
      tags: ['Verification'],
      summary: 'Cancel verification request',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Cancelled' }, '403': { description: 'Cannot cancel' } },
    },
  },
  '/api/v1/verification/history': {
    get: {
      tags: ['Verification'],
      summary: 'Get verification history',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'History list' } },
    },
  },
  '/api/v1/verification/timeline': {
    get: {
      tags: ['Verification'],
      summary: 'Get verification timeline',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Timeline events' } },
    },
  },
  '/api/v1/verification/{verificationId}/documents/front': {
    post: {
      tags: ['Verification'],
      summary: 'Upload government ID front',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Uploaded' } },
    },
  },
  '/api/v1/verification/{verificationId}/documents/back': {
    post: {
      tags: ['Verification'],
      summary: 'Upload government ID back',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Uploaded' } },
    },
  },
  '/api/v1/verification/{verificationId}/documents/selfie': {
    post: {
      tags: ['Verification'],
      summary: 'Upload selfie',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Uploaded' } },
    },
  },
  '/api/v1/admin/verifications': {
    get: {
      tags: ['Verification Admin'],
      summary: 'List pending KYC verifications',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Queue list' }, '403': { description: 'Forbidden' } },
    },
  },
  '/api/v1/admin/verifications/{verificationId}': {
    get: {
      tags: ['Verification Admin'],
      summary: 'Get verification details (admin)',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Admin details with signed URLs' } },
    },
  },
  '/api/v1/admin/verifications/{verificationId}/approve': {
    patch: {
      tags: ['Verification Admin'],
      summary: 'Approve verification',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Approved' } },
    },
  },
  '/api/v1/admin/verifications/{verificationId}/reject': {
    patch: {
      tags: ['Verification Admin'],
      summary: 'Reject verification',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: { reason: { type: 'string' } },
            },
          },
        },
      },
      responses: { '200': { description: 'Rejected' } },
    },
  },
  '/api/v1/admin/verifications/{verificationId}/request-reupload': {
    patch: {
      tags: ['Verification Admin'],
      summary: 'Request document re-upload',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Re-upload requested' } },
    },
  },
  '/api/v1/admin/verifications/{verificationId}/notes': {
    post: {
      tags: ['Verification Admin'],
      summary: 'Add internal review note',
      security: [{ bearerAuth: [] }],
      responses: { '201': { description: 'Note added' } },
    },
  },
  '/api/v1/admin/verifications/{verificationId}/timeline': {
    get: {
      tags: ['Verification Admin'],
      summary: 'Get verification timeline and notes',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Timeline retrieved' } },
    },
  },
} as const;

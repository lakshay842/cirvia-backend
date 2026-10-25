export const hostsOpenApiPaths = {
  '/api/v1/hosts/apply': {
    post: {
      tags: ['Hosts'],
      summary: 'Become a host',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['bio', 'experience', 'languages', 'address', 'emergencyContact'],
              properties: {
                bio: { type: 'string', minLength: 10 },
                experience: { type: 'string' },
                languages: { type: 'array', items: { type: 'string' } },
                interests: { type: 'array', items: { type: 'string' } },
                displayName: { type: 'string' },
                address: { type: 'object' },
                emergencyContact: { type: 'object' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Host application submitted' },
        '401': { description: 'Unauthorized' },
        '409': { description: 'Host profile already exists' },
      },
    },
  },
  '/api/v1/hosts/me': {
    get: {
      tags: ['Hosts'],
      summary: 'Get my host profile',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Profile retrieved' }, '403': { description: 'Host role required' } },
    },
    patch: {
      tags: ['Hosts'],
      summary: 'Update host profile',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Profile updated' } },
    },
  },
  '/api/v1/hosts/{slug}': {
    get: {
      tags: ['Hosts'],
      summary: 'Get public host profile',
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'Public profile' }, '404': { description: 'Not found' } },
    },
  },
  '/api/v1/hosts/documents': {
    post: {
      tags: ['Hosts'],
      summary: 'Upload host documents',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                identityProof: { type: 'string', format: 'binary' },
                addressProof: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
      responses: { '201': { description: 'Documents uploaded' } },
    },
    get: {
      tags: ['Hosts'],
      summary: 'List host documents',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Documents with signed URLs' } },
    },
  },
  '/api/v1/hosts/verification-status': {
    get: {
      tags: ['Hosts'],
      summary: 'Get host verification status',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Status retrieved' } },
    },
  },
  '/api/v1/hosts/dashboard': {
    get: {
      tags: ['Hosts'],
      summary: 'Get host dashboard summary',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Dashboard data' } },
    },
  },
  '/api/v1/hosts/me/statistics': {
    get: {
      tags: ['Hosts'],
      summary: 'Get host statistics',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Statistics retrieved' } },
    },
  },
  '/api/v1/hosts/me/analytics': {
    get: {
      tags: ['Hosts'],
      summary: 'Get host analytics summary',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Analytics retrieved' } },
    },
  },
  '/api/v1/hosts/me/badges': {
    get: {
      tags: ['Hosts'],
      summary: 'Get host badges',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Badges retrieved' } },
    },
  },
  '/api/v1/hosts/me/preferences': {
    get: { tags: ['Hosts'], summary: 'Get host preferences', security: [{ bearerAuth: [] }] },
    patch: { tags: ['Hosts'], summary: 'Update host preferences', security: [{ bearerAuth: [] }] },
  },
  '/api/v1/hosts/me/address': {
    get: { tags: ['Hosts'], summary: 'Get host address', security: [{ bearerAuth: [] }] },
    patch: { tags: ['Hosts'], summary: 'Update host address', security: [{ bearerAuth: [] }] },
  },
  '/api/v1/hosts/me/emergency-contact': {
    get: { tags: ['Hosts'], summary: 'Get emergency contact', security: [{ bearerAuth: [] }] },
    patch: { tags: ['Hosts'], summary: 'Update emergency contact', security: [{ bearerAuth: [] }] },
  },
  '/api/v1/hosts/me/social-links': {
    get: { tags: ['Hosts'], summary: 'Get social links', security: [{ bearerAuth: [] }] },
    patch: { tags: ['Hosts'], summary: 'Update social links', security: [{ bearerAuth: [] }] },
  },
  '/api/v1/hosts/me/availability': {
    get: { tags: ['Hosts'], summary: 'Get availability', security: [{ bearerAuth: [] }] },
    patch: { tags: ['Hosts'], summary: 'Update availability', security: [{ bearerAuth: [] }] },
  },
  '/api/v1/hosts/me/avatar': {
    post: {
      tags: ['Hosts'],
      summary: 'Upload host avatar',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: { 'multipart/form-data': { schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } } },
      },
      responses: { '200': { description: 'Avatar uploaded' } },
    },
  },
  '/api/v1/hosts/me/cover': {
    post: {
      tags: ['Hosts'],
      summary: 'Upload cover image',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Cover uploaded' } },
    },
  },
  '/api/v1/hosts/me/gallery': {
    post: {
      tags: ['Hosts'],
      summary: 'Upload gallery image',
      security: [{ bearerAuth: [] }],
      responses: { '201': { description: 'Gallery image uploaded' } },
    },
  },
  '/api/v1/hosts/me/gallery/{mediaId}': {
    delete: {
      tags: ['Hosts'],
      summary: 'Delete gallery image',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'mediaId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Deleted' } },
    },
  },
  '/api/v1/hosts/me/timeline': {
    get: { tags: ['Hosts'], summary: 'Get host timeline', security: [{ bearerAuth: [] }] },
  },
  '/api/v1/hosts/me/activity': {
    get: { tags: ['Hosts'], summary: 'Get host activity feed', security: [{ bearerAuth: [] }] },
  },
  '/api/v1/hosts/me/profile-completion': {
    get: { tags: ['Hosts'], summary: 'Get profile completion percentage', security: [{ bearerAuth: [] }] },
  },
  '/api/v1/hosts/me/deactivate': {
    post: { tags: ['Hosts'], summary: 'Deactivate host profile', security: [{ bearerAuth: [] }] },
  },
  '/api/v1/hosts/me/reactivate': {
    post: { tags: ['Hosts'], summary: 'Reactivate host profile', security: [{ bearerAuth: [] }] },
  },
  '/api/v1/admin/hosts': {
    get: {
      tags: ['Admin Hosts'],
      summary: 'List hosts for moderation',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Hosts list' }, '403': { description: 'Permission denied' } },
    },
  },
  '/api/v1/admin/hosts/{hostId}': {
    get: {
      tags: ['Admin Hosts'],
      summary: 'Get host details (admin)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'hostId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Host details' } },
    },
  },
  '/api/v1/admin/hosts/{hostId}/approve': {
    patch: {
      tags: ['Admin Hosts'],
      summary: 'Approve host application',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Host approved' } },
    },
  },
  '/api/v1/admin/hosts/{hostId}/reject': {
    patch: {
      tags: ['Admin Hosts'],
      summary: 'Reject host application',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } } } },
      },
      responses: { '200': { description: 'Host rejected' } },
    },
  },
  '/api/v1/admin/hosts/{hostId}/suspend': {
    patch: {
      tags: ['Admin Hosts'],
      summary: 'Suspend host',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Host suspended' } },
    },
  },
};

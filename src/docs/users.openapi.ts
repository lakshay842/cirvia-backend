export const usersOpenApiPaths = {
  '/api/v1/users/me': {
    get: {
      tags: ['Users'],
      summary: 'Get authenticated user profile',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Full user profile' } },
    },
  },
  '/api/v1/users/profile': {
    patch: {
      tags: ['Users'],
      summary: 'Update user profile',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Profile updated' } },
    },
  },
  '/api/v1/users/avatar': {
    post: {
      tags: ['Users'],
      summary: 'Upload profile avatar',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: { 'multipart/form-data': { schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } } },
      },
      responses: { '200': { description: 'Avatar uploaded' } },
    },
  },
  '/api/v1/users/cover-image': {
    post: {
      tags: ['Users'],
      summary: 'Upload cover image',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Cover uploaded' } },
    },
  },
  '/api/v1/users/{username}': {
    get: {
      tags: ['Users'],
      summary: 'Get public profile by username',
      parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'Public profile' } },
    },
  },
  '/api/v1/users/interests': {
    get: {
      tags: ['Users'],
      summary: 'Get user interests',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Interests list' } },
    },
    patch: {
      tags: ['Users'],
      summary: 'Update user interests',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Interests updated' } },
    },
  },
  '/api/v1/users/me/settings': {
    get: {
      tags: ['Users'],
      summary: 'Get all user settings',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Privacy, account, notification settings' } },
    },
  },
  '/api/v1/users/me/settings/privacy': {
    get: { tags: ['Users'], summary: 'Get privacy settings', security: [{ bearerAuth: [] }] },
    patch: { tags: ['Users'], summary: 'Update privacy settings', security: [{ bearerAuth: [] }] },
  },
  '/api/v1/users/me/settings/account': {
    get: { tags: ['Users'], summary: 'Get account settings', security: [{ bearerAuth: [] }] },
    patch: { tags: ['Users'], summary: 'Update account settings', security: [{ bearerAuth: [] }] },
  },
  '/api/v1/users/me/settings/notifications': {
    get: { tags: ['Users'], summary: 'Get notification settings', security: [{ bearerAuth: [] }] },
    patch: { tags: ['Users'], summary: 'Update notification settings', security: [{ bearerAuth: [] }] },
  },
  '/api/v1/users/me/devices': {
    get: {
      tags: ['Users'],
      summary: 'List registered devices',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Device list' } },
    },
  },
  '/api/v1/users/me/connected-accounts': {
    get: {
      tags: ['Users'],
      summary: 'List connected OAuth accounts',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Connected accounts' } },
    },
  },
  '/api/v1/users/trust-score': {
    get: {
      tags: ['Users'],
      summary: 'Get trust score',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Trust score details' } },
    },
  },
  '/api/v1/users/followers': {
    get: {
      tags: ['Users'],
      summary: 'Get my followers',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Followers list' } },
    },
  },
  '/api/v1/users/following': {
    get: {
      tags: ['Users'],
      summary: 'Get users I follow',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Following list' } },
    },
  },
  '/api/v1/users/follow': {
    post: {
      tags: ['Users'],
      summary: 'Follow a user',
      security: [{ bearerAuth: [] }],
      responses: { '201': { description: 'Followed' } },
    },
  },
  '/api/v1/users/me/saved-events': {
    get: {
      tags: ['Users'],
      summary: 'List saved events',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Saved events' } },
    },
  },
  '/api/v1/activity': {
    get: {
      tags: ['Users'],
      summary: 'Get my activity feed',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Activity feed' } },
    },
  },
  '/api/v1/trust-score': {
    get: {
      tags: ['Users'],
      summary: 'Get trust score (alternate path)',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Trust score' } },
    },
  },
  '/api/v1/trust-score/history': {
    get: {
      tags: ['Users'],
      summary: 'Trust score history',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'History' } },
    },
  },
  '/api/v1/trust-score/factors': {
    get: {
      tags: ['Users'],
      summary: 'Trust score factors',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Factors' } },
    },
  },
  '/api/v1/notifications/preferences': {
    get: {
      tags: ['Users'],
      summary: 'Get notification preferences',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Preferences' } },
    },
    patch: {
      tags: ['Users'],
      summary: 'Update notification preferences',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Updated' } },
    },
  },
  '/api/v1/users/{userId}/follow': {
    post: {
      tags: ['Users'],
      summary: 'Follow user by ID',
      security: [{ bearerAuth: [] }],
      responses: { '201': { description: 'Followed' } },
    },
  },
  '/api/v1/users/{userId}/unfollow': {
    delete: {
      tags: ['Users'],
      summary: 'Unfollow user by ID',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Unfollowed' } },
    },
  },
  '/api/v1/users/unfollow/{userId}': {
    delete: {
      tags: ['Users'],
      summary: 'Unfollow user (legacy path)',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Unfollowed' } },
    },
  },
  '/api/v1/users/{userId}/followers': {
    get: {
      tags: ['Users'],
      summary: 'Get user followers',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Followers list' } },
    },
  },
  '/api/v1/users/{userId}/following': {
    get: {
      tags: ['Users'],
      summary: 'Get users followed by user',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Following list' } },
    },
  },
} as const;

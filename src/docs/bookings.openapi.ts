export const bookingsOpenApiPaths = {
  '/api/v1/bookings': {
    post: {
      tags: ['Bookings'],
      summary: 'Create booking',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['eventId', 'ticketQuantity'],
              properties: {
                eventId: { type: 'string', format: 'uuid' },
                ticketQuantity: { type: 'integer', minimum: 1, maximum: 20 },
                couponCode: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Booking created' },
        '400': { description: 'Validation error' },
        '409': { description: 'Booking already exists or event full' },
      },
    },
    get: {
      tags: ['Bookings'],
      summary: 'Get my bookings',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['upcoming', 'past', 'cancelled', 'pending', 'confirmed', 'all'],
          },
        },
      ],
      responses: { '200': { description: 'Bookings list' } },
    },
  },
  '/api/v1/bookings/history': {
    get: {
      tags: ['Bookings'],
      summary: 'Get booking history timeline',
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'History entries' } },
    },
  },
  '/api/v1/bookings/waitlist': {
    post: {
      tags: ['Bookings'],
      summary: 'Join event waitlist',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['eventId'],
              properties: { eventId: { type: 'string', format: 'uuid' } },
            },
          },
        },
      },
      responses: { '201': { description: 'Waitlist joined' } },
    },
  },
  '/api/v1/bookings/waitlist/{waitlistId}': {
    delete: {
      tags: ['Bookings'],
      summary: 'Leave waitlist',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'waitlistId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Removed from waitlist' } },
    },
  },
  '/api/v1/bookings/{bookingId}': {
    get: {
      tags: ['Bookings'],
      summary: 'Get booking details',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Booking details' } },
    },
  },
  '/api/v1/bookings/{bookingId}/status': {
    get: {
      tags: ['Bookings'],
      summary: 'Get booking status',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Booking status' } },
    },
  },
  '/api/v1/bookings/{bookingId}/timeline': {
    get: {
      tags: ['Bookings'],
      summary: 'Get booking timeline',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Timeline entries' } },
    },
  },
  '/api/v1/bookings/{bookingId}/cancel': {
    patch: {
      tags: ['Bookings'],
      summary: 'Cancel booking',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: { reason: { type: 'string', minLength: 5 } },
            },
          },
        },
      },
      responses: { '200': { description: 'Booking cancelled' } },
    },
  },
  '/api/v1/bookings/{bookingId}/cancellation-request': {
    post: {
      tags: ['Bookings'],
      summary: 'Request cancellation for confirmed booking',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Cancellation request submitted' } },
    },
  },
  '/api/v1/bookings/{bookingId}/qr': {
    get: {
      tags: ['Bookings'],
      summary: 'Get QR ticket (placeholder until payment module)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'QR placeholder' } },
    },
  },
  '/api/v1/hosts/bookings': {
    get: {
      tags: ['Bookings'],
      summary: 'List host booking requests',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'rejected', 'all'] },
        },
        { name: 'eventId', in: 'query', schema: { type: 'string', format: 'uuid' } },
      ],
      responses: { '200': { description: 'Host bookings' } },
    },
  },
  '/api/v1/hosts/bookings/{bookingId}/approve': {
    patch: {
      tags: ['Bookings'],
      summary: 'Approve booking request',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Booking approved' } },
    },
  },
  '/api/v1/hosts/bookings/{bookingId}/reject': {
    patch: {
      tags: ['Bookings'],
      summary: 'Reject booking request',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: { reason: { type: 'string', minLength: 5 } },
            },
          },
        },
      },
      responses: { '200': { description: 'Booking rejected' } },
    },
  },
  '/api/v1/events/{eventId}/guests': {
    get: {
      tags: ['Bookings'],
      summary: 'Get event guest list (host)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'eventId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
      ],
      responses: { '200': { description: 'Guest list' } },
    },
  },
  '/api/v1/events/{eventId}/attendance': {
    get: {
      tags: ['Bookings'],
      summary: 'Attendance placeholder (host)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'eventId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Attendance placeholder' } },
    },
  },
};

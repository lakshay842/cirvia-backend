/** Shared OpenAPI components used across all module specs. */

export const bearerSecurity = [{ bearerAuth: [] }] as const;

export const openApiSchemas = {
  ApiSuccessResponse: {
    type: 'object',
    required: ['success', 'message', 'data'],
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Operation successful.' },
      data: { type: 'object' },
      meta: { type: 'object' },
    },
  },
  ApiErrorResponse: {
    type: 'object',
    required: ['success', 'message'],
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Validation failed.' },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          details: { type: 'object' },
        },
      },
    },
  },
  PaginationMeta: {
    type: 'object',
    properties: {
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 100 },
      totalPages: { type: 'integer', example: 5 },
      hasNextPage: { type: 'boolean', example: true },
      hasPreviousPage: { type: 'boolean', example: false },
    },
  },
  EventListItem: {
    type: 'object',
    required: ['id', 'eventId', 'slug', 'hostId', 'bookingRequired', 'capacity', 'availability', 'title', 'status', 'price', 'currency', 'eventStart', 'eventEnd'],
    properties: {
      id: { type: 'string', format: 'uuid', description: 'Public-safe event identifier (alias of eventId)' },
      eventId: { type: 'string', format: 'uuid', description: 'Public-safe event identifier for booking and host actions' },
      slug: { type: 'string' },
      hostId: { type: 'string', format: 'uuid' },
      bookingRequired: { type: 'boolean', description: 'Whether the event currently accepts new bookings' },
      capacity: { type: 'integer' },
      availability: {
        type: 'object',
        properties: {
          capacity: { type: 'integer' },
          remaining: { type: 'integer' },
          isOpen: { type: 'boolean' },
        },
      },
      title: { type: 'string' },
      shortDescription: { type: 'string', nullable: true },
      status: { type: 'string' },
      price: { type: 'number' },
      currency: { type: 'string' },
      eventStart: { type: 'string', format: 'date-time' },
      eventEnd: { type: 'string', format: 'date-time' },
      city: { type: 'string', nullable: true },
      coverImageUrl: { type: 'string', nullable: true },
      isFeatured: { type: 'boolean' },
      isTrending: { type: 'boolean' },
    },
  },
  EventPublic: {
    type: 'object',
    required: ['id', 'eventId', 'slug', 'hostId', 'bookingRequired', 'capacity', 'availability', 'title'],
    properties: {
      id: { type: 'string', format: 'uuid', description: 'Public-safe event identifier (alias of eventId)' },
      eventId: { type: 'string', format: 'uuid', description: 'Public-safe event identifier for booking and host actions' },
      slug: { type: 'string' },
      hostId: { type: 'string', format: 'uuid' },
      bookingRequired: { type: 'boolean' },
      capacity: { type: 'integer' },
      availability: {
        type: 'object',
        properties: {
          capacity: { type: 'integer' },
          remaining: { type: 'integer' },
          isOpen: { type: 'boolean' },
        },
      },
      title: { type: 'string' },
    },
  },
  UuidParam: {
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  },
} as const;

export const standardErrorResponses = {
  '400': {
    description: 'Validation error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorResponse' },
        example: { success: false, message: 'Validation failed.', error: { code: 'VALIDATION_ERROR' } },
      },
    },
  },
  '401': {
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorResponse' },
        example: { success: false, message: 'Unauthorized access.', error: { code: 'UNAUTHORIZED' } },
      },
    },
  },
  '403': {
    description: 'Forbidden',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorResponse' },
        example: { success: false, message: 'Access forbidden.', error: { code: 'FORBIDDEN' } },
      },
    },
  },
  '404': {
    description: 'Not found',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorResponse' },
        example: { success: false, message: 'Resource not found.', error: { code: 'NOT_FOUND' } },
      },
    },
  },
  '409': {
    description: 'Conflict',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorResponse' },
        example: { success: false, message: 'Resource conflict.', error: { code: 'CONFLICT' } },
      },
    },
  },
  '429': {
    description: 'Rate limit exceeded',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorResponse' },
        example: { success: false, message: 'Too many requests.', error: { code: 'RATE_LIMIT_EXCEEDED' } },
      },
    },
  },
} as const;

export function jsonBody(
  schema: Record<string, unknown>,
  example?: Record<string, unknown>,
  required = true,
) {
  return {
    required,
    content: {
      'application/json': {
        schema,
        ...(example !== undefined && { example }),
      },
    },
  };
}

export function successResponse(description: string, example?: Record<string, unknown>) {
  return {
    '200': {
      description,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ApiSuccessResponse' },
          ...(example !== undefined && { example: { success: true, message: description, data: example, meta: {} } }),
        },
      },
    },
    '201': {
      description: `${description} (created)`,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ApiSuccessResponse' },
        },
      },
    },
  };
}

export function op(
  summary: string,
  opts: {
    tags: string[];
    security?: typeof bearerSecurity;
    parameters?: Record<string, unknown>[];
    requestBody?: ReturnType<typeof jsonBody>;
    responses?: Record<string, unknown>;
  },
) {
  return {
    summary,
    tags: opts.tags,
    ...(opts.security !== undefined && { security: opts.security }),
    ...(opts.parameters !== undefined && { parameters: opts.parameters }),
    ...(opts.requestBody !== undefined && { requestBody: opts.requestBody }),
    responses: {
      ...successResponse(summary),
      ...standardErrorResponses,
      ...opts.responses,
    },
  };
}

type OpenApiPathItem = Record<string, Record<string, unknown>>;

function withSchemaResponse(description: string, status: string): Record<string, unknown> {
  const schemaRef = { $ref: '#/components/schemas/ApiSuccessResponse' };
  if (status === '201') {
    return {
      '201': {
        description,
        content: {
          'application/json': {
            schema: schemaRef,
            example: { success: true, message: description, data: {}, meta: {} },
          },
        },
      },
    };
  }
  return {
    '200': {
      description,
      content: {
        'application/json': {
          schema: schemaRef,
          example: { success: true, message: description, data: {}, meta: {} },
        },
      },
    },
  };
}

/** Ensures every operation has standard success + error response schemas. */
export function enrichOpenApiPaths(paths: OpenApiPathItem): OpenApiPathItem {
  const enriched: OpenApiPathItem = {};

  for (const [path, pathItem] of Object.entries(paths)) {
    enriched[path] = {};
    for (const [method, operation] of Object.entries(pathItem)) {
      const opDef = operation as Record<string, unknown>;
      const summary = (opDef.summary as string) ?? `${method.toUpperCase()} ${path}`;
      const existing = (opDef.responses as Record<string, unknown>) ?? {};

      const responses: Record<string, unknown> = {
        ...standardErrorResponses,
        ...successResponse(summary),
        ...existing,
      };

      for (const code of ['200', '201', '204']) {
        const resp = responses[code] as {
          description?: string;
          content?: { 'application/json'?: { schema?: unknown } };
        };
        if (resp && !resp.content?.['application/json']?.schema) {
          responses[code] = withSchemaResponse(resp.description ?? summary, code)[code];
        }
      }

      for (const code of Object.keys(standardErrorResponses)) {
        const resp = responses[code] as {
          content?: { 'application/json'?: { schema?: unknown } };
        };
        if (resp && !resp.content?.['application/json']?.schema) {
          responses[code] = standardErrorResponses[code as keyof typeof standardErrorResponses];
        }
      }

      enriched[path][method] = {
        ...opDef,
        responses,
      };
    }
  }

  return enriched;
}

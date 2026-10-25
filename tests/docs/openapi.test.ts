import { describe, it, expect } from 'vitest';
import { openApiDocument } from '../../src/docs/openapi.js';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
const REQUIRED_ERROR_CODES = ['400', '401', '404', '429'];

describe('OpenAPI document', () => {
  it('documents all implemented API operations', () => {
    let operationCount = 0;
    for (const pathItem of Object.values(openApiDocument.paths)) {
      for (const method of HTTP_METHODS) {
        if (pathItem[method]) operationCount += 1;
      }
    }
    expect(operationCount).toBeGreaterThanOrEqual(200);
  });

  it('includes standard error schemas on every operation', () => {
    for (const [path, pathItem] of Object.entries(openApiDocument.paths)) {
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];
        if (!operation) continue;

        for (const code of REQUIRED_ERROR_CODES) {
          const response = operation.responses?.[code];
          expect(response, `${method.toUpperCase()} ${path} missing ${code}`).toBeDefined();
          const schema =
            response?.content?.['application/json']?.schema?.$ref ??
            response?.content?.['application/json']?.schema;
          expect(schema, `${method.toUpperCase()} ${path} ${code} missing schema`).toBeTruthy();
        }
      }
    }
  });

  it('includes success response schema on every operation', () => {
    for (const [path, pathItem] of Object.entries(openApiDocument.paths)) {
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];
        if (!operation) continue;

        const successCodes = ['200', '201', '204'].filter((c) => operation.responses?.[c]);
        expect(successCodes.length, `${method.toUpperCase()} ${path} missing success response`).toBeGreaterThan(0);

        const primary = operation.responses?.[successCodes[0]!];
        const schema = primary?.content?.['application/json']?.schema;
        expect(schema, `${method.toUpperCase()} ${path} success missing schema`).toBeDefined();
      }
    }
  });

  it('declares bearer auth on protected routes', () => {
    const protectedPrefixes = [
      '/api/v1/users/me',
      '/api/v1/bookings',
      '/api/v1/hosts/me',
      '/api/v1/verification',
      '/api/v1/events/me',
    ];

    for (const [path, pathItem] of Object.entries(openApiDocument.paths)) {
      if (!protectedPrefixes.some((p) => path.startsWith(p))) continue;
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];
        if (!operation) continue;
        expect(operation.security, `${method.toUpperCase()} ${path}`).toEqual([{ bearerAuth: [] }]);
      }
    }
  });
});

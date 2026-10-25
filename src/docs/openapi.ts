import { usersOpenApiPaths } from './users.openapi.js';
import { verificationOpenApiPaths } from './verification.openapi.js';
import { hostsOpenApiPaths } from './hosts.openapi.js';
import { eventsOpenApiPaths } from './events.openapi.js';
import { bookingsOpenApiPaths } from './bookings.openapi.js';
import { paymentsOpenApiPaths } from './payments.openapi.js';
import { walletOpenApiPaths } from './wallet.openapi.js';
import { notificationsOpenApiPaths } from './notifications.openapi.js';
import { reviewsOpenApiPaths } from './reviews.openapi.js';
import { reportsOpenApiPaths } from './reports.openapi.js';
import { analyticsOpenApiPaths } from './analytics.openapi.js';
import { authOpenApiPaths } from './auth.openapi.js';
import { healthOpenApiPaths } from './health.openapi.js';
import { openApiSchemas, enrichOpenApiPaths } from './common.openapi.js';

const rawPaths = {
    ...healthOpenApiPaths,
    ...authOpenApiPaths,
    ...usersOpenApiPaths,
    ...verificationOpenApiPaths,
    ...hostsOpenApiPaths,
    ...eventsOpenApiPaths,
    ...bookingsOpenApiPaths,
    ...paymentsOpenApiPaths,
    ...walletOpenApiPaths,
    ...notificationsOpenApiPaths,
    ...reviewsOpenApiPaths,
    ...reportsOpenApiPaths,
    ...analyticsOpenApiPaths,
  };

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Cirvia API',
    version: '1.1.0',
    description:
      'Cirvia REST API v1.1 — Authentication, Users, Verification, Hosts, Events, Bookings, Payments, Wallet, Notifications, Reviews, Reports, Analytics. All endpoints documented.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Development' }],
  paths: enrichOpenApiPaths(rawPaths as Record<string, Record<string, Record<string, unknown>>>),
  components: {
    schemas: openApiSchemas,
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

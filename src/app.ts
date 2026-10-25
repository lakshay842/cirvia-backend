import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import type { Request } from 'express';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';
import { REQUEST_ID_HEADER } from '@constants/index.js';
import {
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
  createRateLimiter,
} from '@middleware/index.js';
import { healthRouter } from '@routes/health.routes.js';
import { createApiRouter, paymentsWebhookRouter } from '@routes/index.js';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from '@docs/openapi.js';

export function createApp(): Express {
  const config = getConfig();
  const logger = getLogger();
  const app = express();

  app.set('trust proxy', 1);

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req: Request) => req.requestId,
      customProps: (req: Request) => ({ requestId: req.requestId }),
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: config.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  const allowedOrigins = config.CORS_ORIGINS.split(',').map((origin) => origin.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || config.NODE_ENV === 'development') {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', REQUEST_ID_HEADER],
    }),
  );

  app.use(compression());
  app.use(`${config.API_PREFIX}/payments/webhooks`, paymentsWebhookRouter);
  app.use(express.json({ limit: config.REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: config.REQUEST_BODY_LIMIT }));
  app.use(cookieParser());

  app.use(
    createRateLimiter({
      max: 100,
      prefix: 'global',
    }),
  );

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Cirvia API',
      data: {
        version: config.APP_VERSION,
        apiPrefix: config.API_PREFIX,
      },
      meta: {},
    });
  });

  app.use(healthRouter);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.use(config.API_PREFIX, createApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

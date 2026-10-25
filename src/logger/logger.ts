import pino from 'pino';
import { getConfig } from '@config/index.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'otp',
  'token',
  'accessToken',
  'refreshToken',
  'jwt',
  'authorization',
  'card',
  'cvv',
  'secret',
]);

function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSensitive(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function createLogger() {
  const config = getConfig();
  const isDevelopment = config.NODE_ENV === 'development';

  const options: pino.LoggerOptions = {
    level: isDevelopment ? 'debug' : 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        'passwordHash',
        'otp',
        'token',
        'accessToken',
        'refreshToken',
      ],
      censor: '[REDACTED]',
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: (req: { method?: string; url?: string; id?: string }) => ({
        method: req.method,
        url: req.url,
        id: req.id,
      }),
      res: (res: { statusCode?: number }) => ({
        statusCode: res.statusCode,
      }),
    },
    base: {
      env: config.NODE_ENV,
      version: config.APP_VERSION,
    },
  };

  if (isDevelopment) {
    return pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  return pino(options);
}

export type Logger = ReturnType<typeof createLogger>;

let loggerInstance: Logger | null = null;

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = createLogger();
  }
  return loggerInstance;
}

export function resetLoggerForTesting(): void {
  loggerInstance = null;
}

export { redactSensitive };

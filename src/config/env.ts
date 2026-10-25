import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const nodeEnvSchema = z.enum(['development', 'staging', 'production', 'test']);

const baseEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema.default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_VERSION: z.string().min(1).default('1.0.0'),
  API_PREFIX: z.string().min(1).default('/api/v1'),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('30d'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),

  AWS_ACCESS_KEY: z.string().optional(),
  AWS_SECRET_KEY: z.string().optional(),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_BUCKET: z.string().optional(),

  RAZORPAY_KEY: z.string().optional(),
  RAZORPAY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  /** Display From address, e.g. `Cirvia <hello@example.com>` */
  MAIL_FROM: z.string().optional(),

  CORS_ORIGINS: z.string().default('http://localhost:3001,http://localhost:3002'),

  RATE_LIMIT_AUTH: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_SEARCH: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_BOOKING: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_PAYMENT: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_ADMIN: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),

  REQUEST_BODY_LIMIT: z.string().default('10mb'),
});

export type EnvConfig = z.infer<typeof baseEnvSchema>;

function validateProductionRequirements(config: EnvConfig): void {
  if (config.NODE_ENV !== 'production') {
    return;
  }

  const requiredInProduction = [
    'AWS_ACCESS_KEY',
    'AWS_SECRET_KEY',
    'AWS_BUCKET',
    'RAZORPAY_KEY',
    'RAZORPAY_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD',
  ] as const;

  const missing = requiredInProduction.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(', ')}`,
    );
  }
}

export function loadEnvConfig(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  const parsed = baseEnvSchema.safeParse(env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  validateProductionRequirements(parsed.data);
  return parsed.data;
}

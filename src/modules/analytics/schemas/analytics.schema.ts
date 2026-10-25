import { z } from 'zod';

export const analyticsPeriodQuerySchema = z
  .object({
    period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict();

export const exportQuerySchema = z
  .object({
    module: z.enum(['users', 'hosts', 'bookings', 'payments', 'revenue', 'events', 'reports']),
    from: z.string().optional(),
    to: z.string().optional(),
    format: z.enum(['csv', 'excel', 'pdf']).default('csv'),
  })
  .strict();

export type AnalyticsPeriodQuery = z.infer<typeof analyticsPeriodQuerySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;

import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware.js';
import { requirePermission } from '@middleware/authorize.middleware.js';
import { validateRequest } from '@middleware/validate.middleware.js';
import { analyticsController } from '../controller/analytics.controller.js';
import { analyticsPeriodQuerySchema, exportQuerySchema } from '../schemas/analytics.schema.js';

export const adminDashboardRouter = Router();

adminDashboardRouter.use(authenticate, requirePermission('admin.dashboard'));
adminDashboardRouter.get(
  '/',
  validateRequest({ query: analyticsPeriodQuerySchema }),
  analyticsController.getDashboardSummary,
);

export const adminAnalyticsRouter = Router();
export const adminExportRouter = Router();

adminAnalyticsRouter.use(authenticate, requirePermission('analytics.read'));

adminAnalyticsRouter.get(
  '/dashboard',
  validateRequest({ query: analyticsPeriodQuerySchema }),
  analyticsController.getDashboard,
);
adminAnalyticsRouter.get(
  '/revenue',
  validateRequest({ query: analyticsPeriodQuerySchema }),
  analyticsController.getRevenue,
);
adminAnalyticsRouter.get(
  '/users',
  validateRequest({ query: analyticsPeriodQuerySchema }),
  analyticsController.getUsers,
);
adminAnalyticsRouter.get(
  '/hosts',
  validateRequest({ query: analyticsPeriodQuerySchema }),
  analyticsController.getHosts,
);
adminAnalyticsRouter.get(
  '/bookings',
  validateRequest({ query: analyticsPeriodQuerySchema }),
  analyticsController.getBookings,
);
adminAnalyticsRouter.get(
  '/events',
  validateRequest({ query: analyticsPeriodQuerySchema }),
  analyticsController.getEvents,
);
adminAnalyticsRouter.get(
  '/trust',
  validateRequest({ query: analyticsPeriodQuerySchema }),
  analyticsController.getTrust,
);
adminAnalyticsRouter.get(
  '/reports',
  validateRequest({ query: analyticsPeriodQuerySchema }),
  analyticsController.getReports,
);

adminExportRouter.use(authenticate, requirePermission('analytics.read'));
adminExportRouter.get('/', validateRequest({ query: exportQuerySchema }), analyticsController.exportData);

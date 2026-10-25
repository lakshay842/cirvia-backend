import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@common/index.js';
import { analyticsService } from '../service/analytics.service.js';
import type { AnalyticsPeriodQuery, ExportQuery } from '../schemas/analytics.schema.js';

export class AnalyticsController {
  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = await analyticsService.getDashboard(req.query as unknown as AnalyticsPeriodQuery);
      sendSuccess(res, {
        data: {
          users: metrics.users,
          hosts: metrics.hosts,
          events: metrics.events,
          bookings: metrics.bookings,
          payments: metrics.payments,
          revenue: metrics.revenue,
          wallet: metrics.wallet,
          withdrawals: metrics.withdrawals,
          reviews: metrics.reviews,
          reports: metrics.reports,
          retention: metrics.retention,
          topHosts: metrics.topHosts,
          topEvents: metrics.topEvents,
          topCities: metrics.topCities,
          topCategories: metrics.topCategories,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getDashboardSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = await analyticsService.getDashboard(req.query as unknown as AnalyticsPeriodQuery);
      sendSuccess(res, {
        data: {
          users: { total: metrics.users.total, growth: metrics.users.growth },
          hosts: { total: metrics.hosts.total, growth: metrics.hosts.growth },
          events: { total: metrics.events.total, live: metrics.events.live },
          bookings: { total: metrics.bookings.total, conversionRate: metrics.bookings.conversionRate },
          payments: { total: metrics.payments.total, succeeded: metrics.payments.succeeded },
          revenue: { total: metrics.revenue.total, platformFees: metrics.revenue.platformFees },
          reports: metrics.reports,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getRevenue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await analyticsService.getRevenueAnalytics(req.query as unknown as AnalyticsPeriodQuery);
      sendSuccess(res, { data });
    } catch (error) {
      next(error);
    }
  };

  getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await analyticsService.getUserGrowth(req.query as unknown as AnalyticsPeriodQuery);
      sendSuccess(res, { data });
    } catch (error) {
      next(error);
    }
  };

  getHosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await analyticsService.getHostGrowth(req.query as unknown as AnalyticsPeriodQuery);
      sendSuccess(res, { data });
    } catch (error) {
      next(error);
    }
  };

  getBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await analyticsService.getBookingAnalytics(req.query as unknown as AnalyticsPeriodQuery);
      sendSuccess(res, { data });
    } catch (error) {
      next(error);
    }
  };

  getEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await analyticsService.getEventAnalytics(req.query as unknown as AnalyticsPeriodQuery);
      sendSuccess(res, { data });
    } catch (error) {
      next(error);
    }
  };

  getTrust = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await analyticsService.getTrustAnalytics(req.query as unknown as AnalyticsPeriodQuery);
      sendSuccess(res, { data });
    } catch (error) {
      next(error);
    }
  };

  getReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await analyticsService.getReportAnalytics(req.query as unknown as AnalyticsPeriodQuery);
      sendSuccess(res, { data });
    } catch (error) {
      next(error);
    }
  };

  exportData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await analyticsService.exportCsv(req.query as unknown as ExportQuery);
      if (result.format === 'csv' && 'content' in result) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
        return;
      }
      sendSuccess(res, { data: result });
    } catch (error) {
      next(error);
    }
  };
}

export const analyticsController = new AnalyticsController();

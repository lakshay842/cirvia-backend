import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@common/index.js';
import { notificationsService } from '../service/notifications.service.js';
import type {
  NotificationListQuery,
  UpdateNotificationPreferencesInput,
} from '../schemas/notifications.schema.js';

function auditMeta(req: Request): { ip?: string; browser?: string } {
  const meta: { ip?: string; browser?: string } = {};
  if (req.ip) meta.ip = req.ip;
  const browser = req.headers['user-agent'];
  if (browser) meta.browser = browser;
  return meta;
}

export class NotificationsController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await notificationsService.listNotifications(
        req.user!.id,
        req.query as unknown as NotificationListQuery,
      );
      sendSuccess(res, { message: 'Notifications retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { notificationId } = req.params as { notificationId: string };
      const notification = await notificationsService.getNotification(req.user!.id, notificationId);
      sendSuccess(res, { message: 'Notification retrieved.', data: notification });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { notificationId } = req.params as { notificationId: string };
      const notification = await notificationsService.markAsRead(
        req.user!.id,
        notificationId,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Notification marked as read.', data: notification });
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await notificationsService.markAllAsRead(req.user!.id, auditMeta(req));
      sendSuccess(res, { message: 'All notifications marked as read.', data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { notificationId } = req.params as { notificationId: string };
      await notificationsService.deleteNotification(req.user!.id, notificationId, auditMeta(req));
      sendSuccess(res, { message: 'Notification deleted.', data: {} });
    } catch (error) {
      next(error);
    }
  };

  getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const preferences = await notificationsService.getPreferences(req.user!.id);
      sendSuccess(res, { message: 'Notification preferences retrieved.', data: preferences });
    } catch (error) {
      next(error);
    }
  };

  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const preferences = await notificationsService.updatePreferences(
        req.user!.id,
        req.body as UpdateNotificationPreferencesInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Notification preferences updated.', data: preferences });
    } catch (error) {
      next(error);
    }
  };
}

export const notificationsController = new NotificationsController();

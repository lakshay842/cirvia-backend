import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware.js';
import { validateRequest } from '@middleware/validate.middleware.js';
import { notificationsController } from '../controller/notifications.controller.js';
import {
  notificationIdParamSchema,
  notificationListQuerySchema,
  updateNotificationPreferencesSchema,
} from '../schemas/notifications.schema.js';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  '/',
  validateRequest({ query: notificationListQuerySchema }),
  notificationsController.list,
);

notificationsRouter.patch('/read-all', notificationsController.markAllAsRead);

notificationsRouter.get('/preferences', notificationsController.getPreferences);

notificationsRouter.patch(
  '/preferences',
  validateRequest({ body: updateNotificationPreferencesSchema }),
  notificationsController.updatePreferences,
);

notificationsRouter.get(
  '/:notificationId',
  validateRequest({ params: notificationIdParamSchema }),
  notificationsController.getById,
);

notificationsRouter.patch(
  '/:notificationId/read',
  validateRequest({ params: notificationIdParamSchema }),
  notificationsController.markAsRead,
);

notificationsRouter.delete(
  '/:notificationId',
  validateRequest({ params: notificationIdParamSchema }),
  notificationsController.deleteNotification,
);

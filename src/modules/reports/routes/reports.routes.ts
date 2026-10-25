import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware.js';
import { requirePermission } from '@middleware/authorize.middleware.js';
import { validateRequest } from '@middleware/validate.middleware.js';
import { reportsController } from '../controller/reports.controller.js';
import { reportEvidenceUpload } from '../middleware/reports-upload.middleware.js';
import {
  adminReportsQuerySchema,
  assignModeratorSchema,
  closeReportSchema,
  dismissReportSchema,
  investigationNoteSchema,
  myReportsQuerySchema,
  reportBookingSchema,
  reportEventSchema,
  reportHostSchema,
  reportIdParamSchema,
  reportReviewSchema,
  reportUserSchema,
  resolveReportSchema,
} from '../schemas/reports.schema.js';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

reportsRouter.post('/user', validateRequest({ body: reportUserSchema }), reportsController.reportUser);
reportsRouter.post('/host', validateRequest({ body: reportHostSchema }), reportsController.reportHost);
reportsRouter.post('/event', validateRequest({ body: reportEventSchema }), reportsController.reportEvent);
reportsRouter.post('/booking', validateRequest({ body: reportBookingSchema }), reportsController.reportBooking);
reportsRouter.post('/review', validateRequest({ body: reportReviewSchema }), reportsController.reportReview);

reportsRouter.get('/', validateRequest({ query: myReportsQuerySchema }), reportsController.listMyReports);
reportsRouter.get(
  '/:reportId/timeline',
  validateRequest({ params: reportIdParamSchema }),
  reportsController.getTimeline,
);
reportsRouter.post(
  '/:reportId/attachments',
  validateRequest({ params: reportIdParamSchema }),
  reportEvidenceUpload,
  reportsController.uploadEvidence,
);
reportsRouter.get(
  '/:reportId',
  validateRequest({ params: reportIdParamSchema }),
  reportsController.getReport,
);

export const adminReportsRouter = Router();

adminReportsRouter.use(authenticate, requirePermission('reports.moderate'));

adminReportsRouter.get(
  '/',
  validateRequest({ query: adminReportsQuerySchema }),
  reportsController.listAdminReports,
);
adminReportsRouter.get(
  '/:reportId/timeline',
  validateRequest({ params: reportIdParamSchema }),
  reportsController.getAdminTimeline,
);
adminReportsRouter.get(
  '/:reportId',
  validateRequest({ params: reportIdParamSchema }),
  reportsController.getAdminReport,
);
adminReportsRouter.patch(
  '/:reportId/assign',
  validateRequest({ params: reportIdParamSchema, body: assignModeratorSchema }),
  reportsController.assignModerator,
);
adminReportsRouter.post(
  '/:reportId/notes',
  validateRequest({ params: reportIdParamSchema, body: investigationNoteSchema }),
  reportsController.addNote,
);
adminReportsRouter.post(
  '/:reportId/attachments',
  validateRequest({ params: reportIdParamSchema }),
  reportEvidenceUpload,
  reportsController.adminUploadEvidence,
);
adminReportsRouter.patch(
  '/:reportId/resolve',
  validateRequest({ params: reportIdParamSchema, body: resolveReportSchema }),
  reportsController.resolveReport,
);
adminReportsRouter.patch(
  '/:reportId/dismiss',
  validateRequest({ params: reportIdParamSchema, body: dismissReportSchema }),
  reportsController.dismissReport,
);
adminReportsRouter.patch(
  '/:reportId/close',
  validateRequest({ params: reportIdParamSchema, body: closeReportSchema }),
  reportsController.closeReport,
);

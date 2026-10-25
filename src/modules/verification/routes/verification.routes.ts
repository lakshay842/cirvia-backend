import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware.js';
import { requirePermission } from '@middleware/authorize.middleware.js';
import { validateRequest } from '@middleware/validate.middleware.js';
import { verificationController } from '../controller/verification.controller.js';
import {
  submitVerificationUpload,
  resubmitVerificationUpload,
  singleDocumentUpload,
} from '../middleware/verification-upload.middleware.js';
import {
  submitVerificationSchema,
  verificationIdParamSchema,
  resubmitVerificationSchema,
  rejectVerificationSchema,
  requestReuploadSchema,
  internalNoteSchema,
  adminVerificationListQuerySchema,
  paginationQuerySchema,
} from '../schemas/verification.schema.js';

const router = Router();

router.use(authenticate);

// Static routes first (before :verificationId)
router.post(
  '/',
  submitVerificationUpload,
  validateRequest({ body: submitVerificationSchema }),
  verificationController.submit,
);
router.get('/status', verificationController.getStatus);
router.get('/details', verificationController.getCurrentDetails);
router.get(
  '/history',
  validateRequest({ query: paginationQuerySchema }),
  verificationController.getHistory,
);
router.get('/timeline', verificationController.getTimeline);
router.post(
  '/resubmit',
  resubmitVerificationUpload,
  validateRequest({ body: resubmitVerificationSchema }),
  verificationController.resubmit,
);

// Parameterized routes
router.post(
  '/:verificationId/cancel',
  validateRequest({ params: verificationIdParamSchema }),
  verificationController.cancel,
);
router.get(
  '/:verificationId/timeline',
  validateRequest({ params: verificationIdParamSchema }),
  verificationController.getTimeline,
);
router.post(
  '/:verificationId/documents/front',
  validateRequest({ params: verificationIdParamSchema }),
  singleDocumentUpload,
  verificationController.uploadFront,
);
router.post(
  '/:verificationId/documents/back',
  validateRequest({ params: verificationIdParamSchema }),
  singleDocumentUpload,
  verificationController.uploadBack,
);
router.post(
  '/:verificationId/documents/selfie',
  validateRequest({ params: verificationIdParamSchema }),
  singleDocumentUpload,
  verificationController.uploadSelfie,
);
router.get(
  '/:verificationId',
  validateRequest({ params: verificationIdParamSchema }),
  verificationController.getDetails,
);

export const verificationRouter = router;

// Admin routes (API_CONTRACT5)
export const adminVerificationRouter = Router();

adminVerificationRouter.use(authenticate, requirePermission('verification.review'));

adminVerificationRouter.get(
  '/',
  validateRequest({ query: adminVerificationListQuerySchema }),
  verificationController.listPending,
);
adminVerificationRouter.get(
  '/:verificationId/timeline',
  validateRequest({ params: verificationIdParamSchema }),
  verificationController.getAdminTimeline,
);
adminVerificationRouter.post(
  '/:verificationId/notes',
  validateRequest({ params: verificationIdParamSchema, body: internalNoteSchema }),
  verificationController.addInternalNote,
);
adminVerificationRouter.get(
  '/:verificationId',
  validateRequest({ params: verificationIdParamSchema }),
  verificationController.getAdminDetails,
);
adminVerificationRouter.patch(
  '/:verificationId/approve',
  validateRequest({ params: verificationIdParamSchema }),
  verificationController.approve,
);
adminVerificationRouter.patch(
  '/:verificationId/reject',
  validateRequest({ params: verificationIdParamSchema, body: rejectVerificationSchema }),
  verificationController.reject,
);
adminVerificationRouter.patch(
  '/:verificationId/request-reupload',
  validateRequest({ params: verificationIdParamSchema, body: requestReuploadSchema }),
  verificationController.requestReupload,
);

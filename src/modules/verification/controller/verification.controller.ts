import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@common/index.js';
import type { ApiMeta } from '@common/index.js';
import { HTTP_STATUS } from '@constants/index.js';
import { verificationService } from '../service/verification.service.js';
import type {
  AdminVerificationListQuery,
  InternalNoteInput,
  RejectVerificationInput,
  RequestReuploadInput,
  ResubmitVerificationInput,
  SubmitVerificationInput,
} from '../schemas/verification.schema.js';
import type { UploadedVerificationFile } from '../types/verification.types.js';

function auditMeta(req: Request): { ip?: string; browser?: string } {
  const meta: { ip?: string; browser?: string } = {};
  if (req.ip) meta.ip = req.ip;
  const browser = req.headers['user-agent'];
  if (browser) meta.browser = browser;
  return meta;
}

function mapFile(
  file: { buffer: Buffer; mimetype: string; size: number; originalname: string } | undefined,
): UploadedVerificationFile | undefined {
  if (!file) return undefined;
  return {
    buffer: file.buffer,
    mimetype: file.mimetype,
    size: file.size,
    originalname: file.originalname,
  };
}

function mapUploadFiles(files: Record<string, { buffer: Buffer; mimetype: string; size: number; originalname: string }[]> | undefined) {
  const result: {
    governmentId?: UploadedVerificationFile;
    governmentIdBack?: UploadedVerificationFile;
    selfie?: UploadedVerificationFile;
  } = {};
  const gov = mapFile(files?.governmentId?.[0]);
  const back = mapFile(files?.governmentIdBack?.[0]);
  const selfie = mapFile(files?.selfie?.[0]);
  if (gov) result.governmentId = gov;
  if (back) result.governmentIdBack = back;
  if (selfie) result.selfie = selfie;
  return result;
}

export class VerificationController {
  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as Record<string, { buffer: Buffer; mimetype: string; size: number; originalname: string }[]> | undefined;
      const result = await verificationService.submitVerification(
        req.user!.id,
        req.body as SubmitVerificationInput,
        mapUploadFiles(files),
        auditMeta(req),
      );
      sendSuccess(res, {
        message: 'Verification submitted successfully.',
        data: { verification: result },
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await verificationService.getStatus(req.user!.id);
      sendSuccess(res, { message: 'Verification status retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  getDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verificationId } = req.params as { verificationId: string };
      const details = await verificationService.getDetails(req.user!.id, verificationId);
      sendSuccess(res, { message: 'Verification details retrieved.', data: { verification: details } });
    } catch (error) {
      next(error);
    }
  };

  getCurrentDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const details = await verificationService.getCurrentDetails(req.user!.id);
      sendSuccess(res, { message: 'Verification details retrieved.', data: { verification: details } });
    } catch (error) {
      next(error);
    }
  };

  uploadFront = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verificationId } = req.params as { verificationId: string };
      const result = await verificationService.uploadDocument(
        req.user!.id,
        verificationId,
        'front',
        mapFile(req.file)!,
        auditMeta(req),
      );
      sendSuccess(res, { message: result.message, data: { documentId: result.documentId } });
    } catch (error) {
      next(error);
    }
  };

  uploadBack = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verificationId } = req.params as { verificationId: string };
      const result = await verificationService.uploadDocument(
        req.user!.id,
        verificationId,
        'back',
        mapFile(req.file)!,
        auditMeta(req),
      );
      sendSuccess(res, { message: result.message, data: { documentId: result.documentId } });
    } catch (error) {
      next(error);
    }
  };

  uploadSelfie = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verificationId } = req.params as { verificationId: string };
      const result = await verificationService.uploadDocument(
        req.user!.id,
        verificationId,
        'selfie',
        mapFile(req.file)!,
        auditMeta(req),
      );
      sendSuccess(res, { message: result.message, data: { documentId: result.documentId } });
    } catch (error) {
      next(error);
    }
  };

  resubmit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as Record<string, { buffer: Buffer; mimetype: string; size: number; originalname: string }[]> | undefined;
      const result = await verificationService.resubmitVerification(
        req.user!.id,
        req.body as ResubmitVerificationInput,
        mapUploadFiles(files),
        auditMeta(req),
      );
      sendSuccess(res, {
        message: 'Verification resubmitted successfully.',
        data: { verification: result },
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verificationId } = req.params as { verificationId: string };
      const result = await verificationService.cancelVerification(
        req.user!.id,
        verificationId,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Verification cancelled.', data: { verification: result } });
    } catch (error) {
      next(error);
    }
  };

  getTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verificationId } = req.params as { verificationId?: string };
      const result = await verificationService.getTimeline(
        req.user!.id,
        verificationId,
      );
      sendSuccess(res, { message: 'Verification timeline retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await verificationService.getHistory(req.user!.id, req.query as {
        page?: number;
        limit?: number;
      });
      sendSuccess(res, {
        message: 'Verification history retrieved.',
        data: { history: result.history },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  // ─── Admin ─────────────────────────────────────────────────────────────────

  listPending = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await verificationService.listPendingVerifications(
        req.query as AdminVerificationListQuery,
      );
      sendSuccess(res, {
        message: 'Verification queue retrieved.',
        data: { verifications: result.verifications },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  getAdminDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verificationId } = req.params as { verificationId: string };
      const details = await verificationService.getAdminDetails(
        verificationId,
        req.user!.id,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Verification details retrieved.', data: { verification: details } });
    } catch (error) {
      next(error);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verificationId } = req.params as { verificationId: string };
      const result = await verificationService.approveVerification(
        verificationId,
        req.user!.id,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Verification approved.', data: { verification: result } });
    } catch (error) {
      next(error);
    }
  };

  reject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verificationId } = req.params as { verificationId: string };
      const result = await verificationService.rejectVerification(
        verificationId,
        req.user!.id,
        req.body as RejectVerificationInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Verification rejected.', data: { verification: result } });
    } catch (error) {
      next(error);
    }
  };

  requestReupload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verificationId } = req.params as { verificationId: string };
      const result = await verificationService.requestReupload(
        verificationId,
        req.user!.id,
        req.body as RequestReuploadInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Re-upload requested.', data: { verification: result } });
    } catch (error) {
      next(error);
    }
  };

  addInternalNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verificationId } = req.params as { verificationId: string };
      const note = await verificationService.addInternalNote(
        verificationId,
        req.user!.id,
        req.body as InternalNoteInput,
        auditMeta(req),
      );
      sendSuccess(res, {
        message: 'Internal note added.',
        data: { note },
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  getAdminTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verificationId } = req.params as { verificationId: string };
      const result = await verificationService.getAdminTimeline(verificationId);
      sendSuccess(res, { message: 'Verification timeline retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };
}

export const verificationController = new VerificationController();

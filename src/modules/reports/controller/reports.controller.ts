import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@common/index.js';
import { reportsService } from '../service/reports.service.js';
import type {
  AdminReportsQuery,
  AssignModeratorInput,
  DismissReportInput,
  InvestigationNoteInput,
  MyReportsQuery,
  ReportBookingInput,
  ReportEventInput,
  ReportHostInput,
  ReportReviewInput,
  ReportUserInput,
  ResolveReportInput,
} from '../schemas/reports.schema.js';

function auditMeta(req: Request): { ip?: string; browser?: string } {
  const meta: { ip?: string; browser?: string } = {};
  if (req.ip) meta.ip = req.ip;
  const browser = req.headers['user-agent'];
  if (browser) meta.browser = browser;
  return meta;
}

function reportIdFrom(req: Request): string {
  return (req.params as { reportId: string }).reportId;
}

export class ReportsController {
  reportUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await reportsService.reportUser(req.user!.id, req.body as ReportUserInput, auditMeta(req));
      sendSuccess(res, { message: 'Report submitted successfully.', data: result });
    } catch (error) {
      next(error);
    }
  };

  reportHost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await reportsService.reportHost(req.user!.id, req.body as ReportHostInput, auditMeta(req));
      sendSuccess(res, { message: 'Report submitted successfully.', data: result });
    } catch (error) {
      next(error);
    }
  };

  reportEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await reportsService.reportEvent(req.user!.id, req.body as ReportEventInput, auditMeta(req));
      sendSuccess(res, { message: 'Report submitted successfully.', data: result });
    } catch (error) {
      next(error);
    }
  };

  reportBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await reportsService.reportBooking(
        req.user!.id,
        req.body as ReportBookingInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Report submitted successfully.', data: result });
    } catch (error) {
      next(error);
    }
  };

  reportReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await reportsService.reportReview(req.user!.id, req.body as ReportReviewInput, auditMeta(req));
      sendSuccess(res, { message: 'Report submitted successfully.', data: result });
    } catch (error) {
      next(error);
    }
  };

  listMyReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await reportsService.listMyReports(req.user!.id, req.query as unknown as MyReportsQuery);
      sendSuccess(res, { data: result });
    } catch (error) {
      next(error);
    }
  };

  getReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await reportsService.getReportStatus(req.user!.id, reportIdFrom(req));
      sendSuccess(res, { data: { report } });
    } catch (error) {
      next(error);
    }
  };

  getTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await reportsService.getTimeline(req.user!.id, reportIdFrom(req));
      sendSuccess(res, { data: result });
    } catch (error) {
      next(error);
    }
  };

  uploadEvidence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Evidence file is required.' });
        return;
      }
      const result = await reportsService.uploadEvidence(
        req.user!.id,
        reportIdFrom(req),
        {
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          originalname: req.file.originalname,
          size: req.file.size,
        },
        auditMeta(req),
        false,
      );
      sendSuccess(res, { message: 'Evidence uploaded successfully.', data: result });
    } catch (error) {
      next(error);
    }
  };

  adminUploadEvidence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Evidence file is required.' });
        return;
      }
      const result = await reportsService.uploadEvidence(
        req.user!.id,
        reportIdFrom(req),
        {
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          originalname: req.file.originalname,
          size: req.file.size,
        },
        auditMeta(req),
        true,
      );
      sendSuccess(res, { message: 'Evidence uploaded successfully.', data: result });
    } catch (error) {
      next(error);
    }
  };

  listAdminReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await reportsService.listAdminReports(req.query as unknown as AdminReportsQuery);
      sendSuccess(res, { data: result });
    } catch (error) {
      next(error);
    }
  };

  getAdminReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await reportsService.getReportStatus(req.user!.id, reportIdFrom(req), true);
      sendSuccess(res, { data: { report } });
    } catch (error) {
      next(error);
    }
  };

  getAdminTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await reportsService.getTimeline(req.user!.id, reportIdFrom(req), true);
      sendSuccess(res, { data: result });
    } catch (error) {
      next(error);
    }
  };

  assignModerator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await reportsService.assignModerator(
        req.user!.id,
        reportIdFrom(req),
        req.body as AssignModeratorInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Moderator assigned.', data: { report } });
    } catch (error) {
      next(error);
    }
  };

  addNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await reportsService.addInvestigationNote(
        req.user!.id,
        reportIdFrom(req),
        req.body as InvestigationNoteInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Investigation note added.', data: { report } });
    } catch (error) {
      next(error);
    }
  };

  resolveReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await reportsService.resolveReport(
        req.user!.id,
        reportIdFrom(req),
        req.body as ResolveReportInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Report resolved.', data: { report } });
    } catch (error) {
      next(error);
    }
  };

  dismissReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await reportsService.dismissReport(
        req.user!.id,
        reportIdFrom(req),
        req.body as DismissReportInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Report dismissed.', data: { report } });
    } catch (error) {
      next(error);
    }
  };

  closeReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await reportsService.closeReport(
        req.user!.id,
        reportIdFrom(req),
        (req.body as { reason?: string }).reason,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Report closed.', data: { report } });
    } catch (error) {
      next(error);
    }
  };
}

export const reportsController = new ReportsController();

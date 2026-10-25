import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@errors/index.js';
import { getRedisClient } from '@redis/index.js';
import type { ReportActionType, ReportType } from '@prisma/client';
import { s3Uploader } from '@shared/upload/index.js';
import { buildPaginationMeta, parsePagination } from '../../../utils/pagination.util.js';
import { REPORTS_CONSTANTS } from '../constants/reports.constants.js';
import { toReportDetailDto, toReportSummaryDto, toTimelineDto } from '../dto/reports.dto.js';
import { emitReportDomainEvent } from '../events/reports.events.js';
import { enqueueReportJob } from '../events/reports.queue.js';
import { reportsRepository } from '../repository/reports.repository.js';
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
import type { AuditMeta, UploadedReportFile } from '../types/reports.types.js';
import {
  mapReportCategory,
  mapReportPriority,
  mapReportStatus,
  mapReportType,
  toReviewType,
} from '../utils/reports.util.js';

export class ReportsService {
  private async writeAudit(
    action: string,
    entityId: string,
    userId?: string,
    changes?: Record<string, unknown>,
    audit?: AuditMeta,
  ): Promise<void> {
    await reportsRepository.createAuditLog({
      action,
      entityId,
      ...(userId !== undefined && { userId }),
      ...(changes !== undefined && { changes }),
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
  }

  private async invalidateCaches(reportId: string, reporterId?: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(REPORTS_CONSTANTS.REDIS_KEYS.detail(reportId));
      if (reporterId) {
        await redis.del(`cache:reports:mine:${reporterId}:*`);
      }
      await redis.del('cache:reports:admin:queue:*');
    } catch {
      // optional
    }
  }

  private assertNotSelf(reporterId: string, targetUserId?: string): void {
    if (targetUserId && reporterId === targetUserId) {
      throw new ValidationError('You cannot report yourself.', {
        details: { code: REPORTS_CONSTANTS.ERROR_CODES.SELF_REPORT },
      });
    }
  }

  private async assertNoDuplicate(params: {
    reporterId: string;
    reportType: ReportType;
    reportedUserId?: string;
    reportedHostId?: string;
    reportedEventId?: string;
    reportedBookingId?: string;
    reportedReviewId?: string;
    reviewType?: ReturnType<typeof toReviewType>;
  }): Promise<void> {
    const existing = await reportsRepository.findDuplicateReport(params);
    if (existing) {
      throw new ConflictError('You have already reported this content.', {
        details: { code: REPORTS_CONSTANTS.ERROR_CODES.DUPLICATE_REPORT },
      });
    }
  }

  private async createReportInternal(
    reporterId: string,
    reportType: ReportType,
    input: { reason: string; description?: string | undefined },
    target: {
      reportedUserId?: string;
      reportedHostId?: string;
      reportedEventId?: string;
      reportedBookingId?: string;
      reportedReviewId?: string;
      reviewType?: ReturnType<typeof toReviewType>;
    },
    audit?: AuditMeta,
  ) {
    await this.assertNoDuplicate({ reporterId, reportType, ...target });

    const report = await reportsRepository.createReport({
      reporter: { connect: { id: reporterId } },
      reportType,
      category: mapReportCategory(input.reason),
      reason: input.reason,
      ...(input.description !== undefined && { description: input.description }),
      ...(target.reportedUserId && { reportedUser: { connect: { id: target.reportedUserId } } }),
      ...(target.reportedHostId && { reportedHost: { connect: { id: target.reportedHostId } } }),
      ...(target.reportedEventId && { reportedEvent: { connect: { id: target.reportedEventId } } }),
      ...(target.reportedBookingId && { reportedBooking: { connect: { id: target.reportedBookingId } } }),
      ...(target.reportedReviewId && { reportedReviewId: target.reportedReviewId }),
      ...(target.reviewType && { reviewType: target.reviewType }),
    });

    await this.writeAudit(REPORTS_CONSTANTS.AUDIT_ACTIONS.SUBMITTED, report.id, reporterId, { reportType }, audit);
    emitReportDomainEvent('report.submitted', { reportId: report.id, reporterId, reportType });
    await enqueueReportJob(REPORTS_CONSTANTS.JOB_TYPES.NOTIFY_ASSIGNEE, { reportId: report.id });
    await this.invalidateCaches(report.id, reporterId);

    return toReportDetailDto(report);
  }

  async reportUser(reporterId: string, input: ReportUserInput, audit?: AuditMeta) {
    const user = await reportsRepository.findUserById(input.userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    this.assertNotSelf(reporterId, input.userId);
    const report = await this.createReportInternal(
      reporterId,
      'USER',
      input,
      { reportedUserId: input.userId },
      audit,
    );
    return { reportId: report.id, report };
  }

  async reportHost(reporterId: string, input: ReportHostInput, audit?: AuditMeta) {
    const host = await reportsRepository.findHostById(input.hostId);
    if (!host) {
      throw new NotFoundError('Host not found.');
    }
    this.assertNotSelf(reporterId, host.userId);
    const report = await this.createReportInternal(
      reporterId,
      'HOST',
      input,
      { reportedHostId: input.hostId, reportedUserId: host.userId },
      audit,
    );
    return { reportId: report.id, report };
  }

  async reportEvent(reporterId: string, input: ReportEventInput, audit?: AuditMeta) {
    const event = await reportsRepository.findEventById(input.eventId);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }
    const report = await this.createReportInternal(
      reporterId,
      'EVENT',
      input,
      { reportedEventId: input.eventId },
      audit,
    );
    return { reportId: report.id, report };
  }

  async reportBooking(reporterId: string, input: ReportBookingInput, audit?: AuditMeta) {
    const booking = await reportsRepository.findBookingById(input.bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found.');
    }
    const report = await this.createReportInternal(
      reporterId,
      'BOOKING',
      input,
      { reportedBookingId: input.bookingId },
      audit,
    );
    return { reportId: report.id, report };
  }

  async reportReview(reporterId: string, input: ReportReviewInput, audit?: AuditMeta) {
    const reviewType = toReviewType(input.type);
    const review = await reportsRepository.findReview(reviewType, input.reviewId);
    if (!review) {
      throw new NotFoundError('Review not found.');
    }
    const report = await this.createReportInternal(
      reporterId,
      'REVIEW',
      input,
      { reportedReviewId: input.reviewId, reviewType },
      audit,
    );
    return { reportId: report.id, report };
  }

  async listMyReports(userId: string, query: MyReportsQuery) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const status = mapReportStatus(query.status);
    const reportType = query.type === 'all' ? undefined : mapReportType(query.type);

    const { items, total } = await reportsRepository.listMyReports({
      reporterId: userId,
      ...(status !== undefined && { status }),
      ...(reportType !== undefined && { reportType }),
      skip,
      take: limit,
    });

    return {
      reports: items.map(toReportSummaryDto),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getReportStatus(userId: string, reportId: string, isAdmin = false) {
    const report = await reportsRepository.findReportById(reportId);
    if (!report) {
      throw new NotFoundError('Report not found.');
    }
    if (!isAdmin && report.reporterId !== userId) {
      throw new ForbiddenError('You do not have access to this report.');
    }
    return toReportDetailDto(report);
  }

  async getTimeline(userId: string, reportId: string, isAdmin = false) {
    const report = await reportsRepository.findReportById(reportId);
    if (!report) {
      throw new NotFoundError('Report not found.');
    }
    if (!isAdmin && report.reporterId !== userId) {
      throw new ForbiddenError('You do not have access to this report timeline.');
    }
    return { timeline: toTimelineDto(report) };
  }

  async uploadEvidence(
    userId: string,
    reportId: string,
    file: UploadedReportFile,
    audit?: AuditMeta,
    isAdmin = false,
  ) {
    const report = await reportsRepository.findReportById(reportId);
    if (!report) throw new NotFoundError('Report not found.');
    if (!isAdmin && report.reporterId !== userId) {
      throw new ForbiddenError('You cannot upload evidence for this report.');
    }

    const count = await reportsRepository.countAttachments(reportId);
    if (count >= REPORTS_CONSTANTS.MAX_ATTACHMENTS) {
      throw new ValidationError('Maximum evidence attachments reached.', {
        details: { code: REPORTS_CONSTANTS.ERROR_CODES.MAX_ATTACHMENTS },
      });
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const result = await s3Uploader.uploadPrivate('reports', `${reportId}/${fileName}`, file.buffer, file.mimetype);
    const fileUrl = result.key;

    const attachment = await reportsRepository.createAttachment({
      reportId,
      uploadedBy: userId,
      fileUrl,
      fileName: file.originalname,
      mimeType: file.mimetype,
    });

    await this.writeAudit(
      REPORTS_CONSTANTS.AUDIT_ACTIONS.ATTACHMENT_ADDED,
      reportId,
      userId,
      { attachmentId: attachment.id },
      audit,
    );
    await this.invalidateCaches(reportId, report.reporterId);

    return { attachment };
  }

  async listAdminReports(query: AdminReportsQuery) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const status = mapReportStatus(query.status);
    const priority = mapReportPriority(query.priority);
    const reportType = query.type === 'all' ? undefined : mapReportType(query.type);
    const category = query.category === 'all' ? undefined : mapReportCategory(query.category);

    const { items, total } = await reportsRepository.listAdminReports({
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(reportType !== undefined && { reportType }),
      ...(category !== undefined && { category }),
      ...(query.assignedTo && { assignedTo: query.assignedTo }),
      skip,
      take: limit,
    });

    return {
      reports: items.map(toReportSummaryDto),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async assignModerator(adminId: string, reportId: string, input: AssignModeratorInput, audit?: AuditMeta) {
    const report = await reportsRepository.findReportById(reportId);
    if (!report) throw new NotFoundError('Report not found.');

    const moderator = await reportsRepository.findUserById(input.moderatorId);
    if (!moderator) throw new NotFoundError('Moderator not found.');

    const updated = await reportsRepository.updateReport(reportId, {
      assignee: { connect: { id: input.moderatorId } },
      status: report.status === 'PENDING' ? 'UNDER_REVIEW' : report.status,
    });

    await reportsRepository.createAction({
      reportId,
      action: 'ASSIGNED',
      performedBy: adminId,
      ...(input.note !== undefined && { notes: input.note }),
    });

    await this.writeAudit(REPORTS_CONSTANTS.AUDIT_ACTIONS.ASSIGNED, reportId, adminId, input, audit);
    emitReportDomainEvent('report.assigned', { reportId, moderatorId: input.moderatorId });
    await enqueueReportJob(REPORTS_CONSTANTS.JOB_TYPES.NOTIFY_ASSIGNEE, {
      reportId,
      moderatorId: input.moderatorId,
    });
    await this.invalidateCaches(reportId, report.reporterId);

    return toReportDetailDto(updated);
  }

  async addInvestigationNote(
    adminId: string,
    reportId: string,
    input: InvestigationNoteInput,
    audit?: AuditMeta,
  ) {
    const report = await reportsRepository.findReportById(reportId);
    if (!report) throw new NotFoundError('Report not found.');

    await reportsRepository.createAction({
      reportId,
      action: 'NOTE',
      performedBy: adminId,
      notes: input.note,
    });

    await this.writeAudit(REPORTS_CONSTANTS.AUDIT_ACTIONS.NOTE_ADDED, reportId, adminId, input, audit);
    emitReportDomainEvent('report.note_added', { reportId, adminId });
    await this.invalidateCaches(reportId, report.reporterId);

    const refreshed = await reportsRepository.findReportById(reportId);
    return toReportDetailDto(refreshed!);
  }

  private async changeStatus(
    adminId: string,
    reportId: string,
    status: 'RESOLVED' | 'REJECTED' | 'CLOSED',
    resolution: string,
    action?: ReportActionType,
    audit?: AuditMeta,
  ) {
    const report = await reportsRepository.findReportById(reportId);
    if (!report) throw new NotFoundError('Report not found.');

    const updated = await reportsRepository.updateReport(reportId, {
      status,
      resolution,
      resolvedAt: new Date(),
    });

    if (action) {
      await reportsRepository.createAction({
        reportId,
        action,
        performedBy: adminId,
        notes: resolution,
      });
    }

    const auditAction =
      status === 'RESOLVED'
        ? REPORTS_CONSTANTS.AUDIT_ACTIONS.RESOLVED
        : status === 'REJECTED'
          ? REPORTS_CONSTANTS.AUDIT_ACTIONS.DISMISSED
          : REPORTS_CONSTANTS.AUDIT_ACTIONS.CLOSED;

    await this.writeAudit(auditAction, reportId, adminId, { status, resolution }, audit);
    emitReportDomainEvent(
      status === 'RESOLVED' ? 'report.resolved' : status === 'REJECTED' ? 'report.rejected' : 'report.closed',
      { reportId, adminId },
    );
    await enqueueReportJob(REPORTS_CONSTANTS.JOB_TYPES.NOTIFY_REPORTER, {
      reportId,
      userId: report.reporterId,
      status,
    });
    await enqueueReportJob(REPORTS_CONSTANTS.JOB_TYPES.RECALC_TRUST, { reportId });
    await this.invalidateCaches(reportId, report.reporterId);

    return toReportDetailDto(updated);
  }

  async resolveReport(adminId: string, reportId: string, input: ResolveReportInput, audit?: AuditMeta) {
    const actionMap: Record<NonNullable<ResolveReportInput['action']>, ReportActionType> = {
      warning: 'WARNING',
      suspend: 'SUSPEND',
      ban: 'BAN',
      dismiss: 'DISMISS',
      escalate: 'ESCALATE',
    };
    const action = input.action ? actionMap[input.action] : 'WARNING';
    return this.changeStatus(adminId, reportId, 'RESOLVED', input.resolution, action, audit);
  }

  async dismissReport(adminId: string, reportId: string, input: DismissReportInput, audit?: AuditMeta) {
    return this.changeStatus(adminId, reportId, 'REJECTED', input.reason, 'DISMISS', audit);
  }

  async closeReport(adminId: string, reportId: string, reason: string | undefined, audit?: AuditMeta) {
    return this.changeStatus(adminId, reportId, 'CLOSED', reason ?? 'Closed without action.', undefined, audit);
  }
}

export const reportsService = new ReportsService();

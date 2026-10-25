import { prisma } from '@database/index.js';
import type {
  Prisma,
  ReportActionType,
  ReportCategory,
  ReportPriority,
  ReportStatus,
  ReportType,
  ReviewType,
} from '@prisma/client';

const notDeleted = { deletedAt: null };

export class ReportsRepository {
  async findUserById(userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, isDeleted: false, deletedAt: null },
      include: { profile: true },
    });
  }

  async findHostById(hostId: string) {
    return prisma.hostProfile.findFirst({ where: { id: hostId, deletedAt: null } });
  }

  async findEventById(eventId: string) {
    return prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
  }

  async findBookingById(bookingId: string) {
    return prisma.eventBooking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: { event: { select: { id: true, hostId: true } } },
    });
  }

  async findReview(reviewType: ReviewType, reviewId: string) {
    switch (reviewType) {
      case 'EVENT':
        return prisma.eventReview.findFirst({ where: { id: reviewId, deletedAt: null } });
      case 'HOST':
        return prisma.hostReview.findFirst({ where: { id: reviewId, deletedAt: null } });
      case 'GUEST':
        return prisma.guestReview.findFirst({ where: { id: reviewId, deletedAt: null } });
    }
  }

  async findDuplicateReport(params: {
    reporterId: string;
    reportType: ReportType;
    reportedUserId?: string;
    reportedHostId?: string;
    reportedEventId?: string;
    reportedBookingId?: string;
    reportedReviewId?: string;
    reviewType?: ReviewType;
  }) {
    return prisma.report.findFirst({
      where: {
        reporterId: params.reporterId,
        reportType: params.reportType,
        deletedAt: null,
        status: { notIn: ['REJECTED', 'CLOSED'] },
        ...(params.reportedUserId && { reportedUserId: params.reportedUserId }),
        ...(params.reportedHostId && { reportedHostId: params.reportedHostId }),
        ...(params.reportedEventId && { reportedEventId: params.reportedEventId }),
        ...(params.reportedBookingId && { reportedBookingId: params.reportedBookingId }),
        ...(params.reportedReviewId && {
          reportedReviewId: params.reportedReviewId,
          reviewType: params.reviewType,
        }),
      },
    });
  }

  async createReport(data: Prisma.ReportCreateInput) {
    return prisma.report.create({
      data,
      include: {
        reporter: { include: { profile: true } },
        reportedUser: { include: { profile: true } },
        reportedHost: true,
        reportedEvent: { select: { id: true, title: true, slug: true } },
        reportedBooking: { select: { id: true, bookingReference: true } },
        assignee: { include: { profile: true } },
        attachments: true,
        actions: {
          include: { performer: { include: { profile: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findReportById(reportId: string) {
    return prisma.report.findFirst({
      where: { id: reportId, ...notDeleted },
      include: {
        reporter: { include: { profile: true } },
        reportedUser: { include: { profile: true } },
        reportedHost: true,
        reportedEvent: { select: { id: true, title: true, slug: true } },
        reportedBooking: { select: { id: true, bookingReference: true } },
        assignee: { include: { profile: true } },
        attachments: true,
        actions: {
          include: { performer: { include: { profile: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async listMyReports(params: {
    reporterId: string;
    status?: ReportStatus;
    reportType?: ReportType;
    skip: number;
    take: number;
  }) {
    const where: Prisma.ReportWhereInput = {
      reporterId: params.reporterId,
      ...notDeleted,
      ...(params.status && { status: params.status }),
      ...(params.reportType && { reportType: params.reportType }),
    };

    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reportedUser: { include: { profile: true } },
          reportedHost: true,
          reportedEvent: { select: { id: true, title: true, slug: true } },
          reportedBooking: { select: { id: true, bookingReference: true } },
          assignee: { include: { profile: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.report.count({ where }),
    ]);

    return { items, total };
  }

  async listAdminReports(params: {
    status?: ReportStatus;
    category?: ReportCategory;
    priority?: ReportPriority;
    reportType?: ReportType;
    assignedTo?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.ReportWhereInput = {
      ...notDeleted,
      ...(params.status && { status: params.status }),
      ...(params.category && { category: params.category }),
      ...(params.priority && { priority: params.priority }),
      ...(params.reportType && { reportType: params.reportType }),
      ...(params.assignedTo && { assignedTo: params.assignedTo }),
    };

    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: { include: { profile: true } },
          reportedUser: { include: { profile: true } },
          reportedHost: true,
          reportedEvent: { select: { id: true, title: true, slug: true } },
          reportedBooking: { select: { id: true, bookingReference: true } },
          assignee: { include: { profile: true } },
          _count: { select: { attachments: true, actions: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: params.skip,
        take: params.take,
      }),
      prisma.report.count({ where }),
    ]);

    return { items, total };
  }

  async updateReport(reportId: string, data: Prisma.ReportUpdateInput) {
    return prisma.report.update({
      where: { id: reportId },
      data,
      include: {
        reporter: { include: { profile: true } },
        reportedUser: { include: { profile: true } },
        reportedHost: true,
        reportedEvent: { select: { id: true, title: true, slug: true } },
        reportedBooking: { select: { id: true, bookingReference: true } },
        assignee: { include: { profile: true } },
        attachments: true,
        actions: {
          include: { performer: { include: { profile: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async createAction(data: {
    reportId: string;
    action: ReportActionType;
    performedBy: string;
    notes?: string;
  }) {
    return prisma.reportAction.create({
      data,
      include: { performer: { include: { profile: true } } },
    });
  }

  async createAttachment(data: {
    reportId: string;
    uploadedBy: string;
    fileUrl: string;
    fileName?: string;
    mimeType?: string;
  }) {
    return prisma.reportAttachment.create({ data });
  }

  async countAttachments(reportId: string) {
    return prisma.reportAttachment.count({ where: { reportId } });
  }

  async createAuditLog(params: {
    action: string;
    entityId: string;
    userId?: string;
    changes?: Record<string, unknown>;
    ip?: string;
    browser?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        action: params.action,
        entity: 'report',
        entityId: params.entityId,
        ...(params.userId && { userId: params.userId }),
        ...(params.changes && { changes: params.changes as Prisma.InputJsonValue }),
        ...(params.ip && { ip: params.ip }),
        ...(params.browser && { browser: params.browser }),
      },
    });
  }
}

export const reportsRepository = new ReportsRepository();

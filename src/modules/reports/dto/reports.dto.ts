import type {
  Report,
  ReportAction,
  ReportAttachment,
  HostProfile,
  Event,
  EventBooking,
  User,
  UserProfile,
} from '@prisma/client';
import { categoryLabel, statusLabel, toReportTypeSlug } from '../utils/reports.util.js';

type UserWithProfile = User & { profile: UserProfile | null };

type ReportWithRelations = Report & {
  reporter?: UserWithProfile;
  reportedUser?: UserWithProfile | null;
  reportedHost?: HostProfile | null;
  reportedEvent?: Pick<Event, 'id' | 'title' | 'slug'> | null;
  reportedBooking?: Pick<EventBooking, 'id' | 'bookingReference'> | null;
  assignee?: UserWithProfile | null;
  attachments?: ReportAttachment[];
  actions?: Array<ReportAction & { performer?: UserWithProfile }>;
  _count?: { attachments: number; actions: number };
};

function userSummary(user?: UserWithProfile | null) {
  if (!user) return null;
  const name = user.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`.trim() || user.email.split('@')[0]!
    : user.email.split('@')[0]!;
  return {
    id: user.id,
    displayName: name,
    username: user.profile?.username ?? null,
  };
}

export function toReportSummaryDto(report: ReportWithRelations) {
  return {
    id: report.id,
    type: toReportTypeSlug(report.reportType),
    category: categoryLabel(report.category),
    reason: report.reason,
    status: statusLabel(report.status),
    priority: report.priority.toLowerCase(),
    createdAt: report.createdAt.toISOString(),
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
    target: {
      user: userSummary(report.reportedUser),
      host: report.reportedHost
        ? { id: report.reportedHost.id, displayName: report.reportedHost.displayName, slug: report.reportedHost.slug }
        : null,
      event: report.reportedEvent
        ? { id: report.reportedEvent.id, title: report.reportedEvent.title, slug: report.reportedEvent.slug }
        : null,
      booking: report.reportedBooking
        ? { id: report.reportedBooking.id, reference: report.reportedBooking.bookingReference }
        : null,
      review: report.reportedReviewId
        ? { id: report.reportedReviewId, type: report.reviewType?.toLowerCase() ?? null }
        : null,
    },
    assignee: userSummary(report.assignee),
    attachmentCount: report._count?.attachments ?? report.attachments?.length ?? 0,
  };
}

export function toReportDetailDto(report: ReportWithRelations) {
  return {
    ...toReportSummaryDto(report),
    description: report.description,
    resolution: report.resolution,
    reporter: userSummary(report.reporter),
    attachments: (report.attachments ?? []).map((a) => ({
      id: a.id,
      fileUrl: a.fileUrl,
      fileName: a.fileName,
      mimeType: a.mimeType,
      createdAt: a.createdAt.toISOString(),
    })),
    actions: (report.actions ?? []).map((action) => ({
      id: action.id,
      action: action.action.toLowerCase(),
      notes: action.notes,
      performedBy: userSummary(action.performer),
      createdAt: action.createdAt.toISOString(),
    })),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export function toTimelineDto(
  report: ReportWithRelations,
): Array<{
  id: string;
  type: string;
  title: string;
  description?: string | undefined;
  performedBy?: ReturnType<typeof userSummary>;
  createdAt: string;
}> {
  const entries: Array<{
    id: string;
    type: string;
    title: string;
    description?: string | undefined;
    performedBy?: ReturnType<typeof userSummary>;
    createdAt: string;
    sortAt: Date;
  }> = [
    {
      id: `created-${report.id}`,
      type: 'created',
      title: 'Report submitted',
      ...(report.description ? { description: report.description } : {}),
      performedBy: userSummary(report.reporter),
      createdAt: report.createdAt.toISOString(),
      sortAt: report.createdAt,
    },
  ];

  for (const action of report.actions ?? []) {
    entries.push({
      id: action.id,
      type: action.action === 'NOTE' ? 'note' : action.action === 'ASSIGNED' ? 'assignment' : 'action',
      title: action.action.replace(/_/g, ' '),
      ...(action.notes ? { description: action.notes } : {}),
      performedBy: userSummary(action.performer),
      createdAt: action.createdAt.toISOString(),
      sortAt: action.createdAt,
    });
  }

  for (const attachment of report.attachments ?? []) {
    entries.push({
      id: attachment.id,
      type: 'attachment',
      title: 'Evidence uploaded',
      ...(attachment.fileName ? { description: attachment.fileName } : {}),
      createdAt: attachment.createdAt.toISOString(),
      sortAt: attachment.createdAt,
    });
  }

  return entries
    .sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime())
    .map(({ sortAt: _sortAt, ...entry }) => entry);
}

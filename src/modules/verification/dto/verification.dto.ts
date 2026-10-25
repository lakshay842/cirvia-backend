import type {
  AdminVerificationListItem,
  VerificationDetailsView,
  VerificationDocumentView,
  VerificationHistoryItem,
  VerificationReviewNoteView,
  VerificationStatusView,
  VerificationTimelineItem,
} from '../types/verification.types.js';
import type { VerificationRequest, VerificationDocument, VerificationHistory } from '@prisma/client';

type RequestWithRelations = VerificationRequest & {
  documents: VerificationDocument[];
  history: VerificationHistory[];
  user?: { email: string; profile: { username: string } | null };
};

export function toStatusDto(
  request: VerificationRequest,
  includeRemarks = true,
): VerificationStatusView {
  return {
    id: request.id,
    verificationType: request.verificationType,
    status: request.status,
    submittedAt: request.submittedAt,
    reviewedAt: request.reviewedAt,
    remarks: includeRemarks ? request.remarks : null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export function toDocumentDto(
  doc: VerificationDocument,
  signedUrls?: { front?: string; back?: string; selfie?: string },
): VerificationDocumentView {
  const view: VerificationDocumentView = {
    id: doc.id,
    documentType: doc.documentType,
    hasFrontImage: Boolean(doc.frontImage),
    hasBackImage: Boolean(doc.backImage),
    hasSelfieImage: Boolean(doc.selfieImage),
    expiryDate: doc.expiryDate,
    createdAt: doc.createdAt,
  };
  if (signedUrls?.front) view.frontImageUrl = signedUrls.front;
  if (signedUrls?.back) view.backImageUrl = signedUrls.back;
  if (signedUrls?.selfie) view.selfieImageUrl = signedUrls.selfie;
  return view;
}

export function toTimelineDto(item: VerificationHistory): VerificationTimelineItem {
  return {
    id: item.id,
    oldStatus: item.oldStatus,
    newStatus: item.newStatus,
    reason: item.reason,
    changedBy: item.changedBy,
    createdAt: item.createdAt,
  };
}

export function toDetailsDto(
  request: RequestWithRelations,
  documents: VerificationDocumentView[],
  timeline: VerificationTimelineItem[],
): VerificationDetailsView {
  return {
    ...toStatusDto(request),
    documents,
    timeline,
  };
}

export function toHistoryItemDto(request: VerificationRequest): VerificationHistoryItem {
  return {
    id: request.id,
    verificationType: request.verificationType,
    status: request.status,
    submittedAt: request.submittedAt,
    reviewedAt: request.reviewedAt,
    remarks: request.remarks,
    createdAt: request.createdAt,
  };
}

export function toAdminListItemDto(request: RequestWithRelations): AdminVerificationListItem {
  return {
    id: request.id,
    userId: request.userId,
    userEmail: request.user?.email ?? '',
    username: request.user?.profile?.username ?? null,
    verificationType: request.verificationType,
    status: request.status,
    submittedAt: request.submittedAt,
    createdAt: request.createdAt,
  };
}

export function toReviewNoteDto(note: {
  id: string;
  reviewerId: string;
  note: string;
  isInternal: boolean;
  createdAt: Date;
}): VerificationReviewNoteView {
  return {
    id: note.id,
    reviewerId: note.reviewerId,
    note: note.note,
    isInternal: note.isInternal,
    createdAt: note.createdAt,
  };
}

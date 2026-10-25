import type { DocumentType, VerificationStatus, VerificationType } from '@prisma/client';

export interface VerificationDocumentView {
  id: string;
  documentType: DocumentType;
  hasFrontImage: boolean;
  hasBackImage: boolean;
  hasSelfieImage: boolean;
  frontImageUrl?: string;
  backImageUrl?: string;
  selfieImageUrl?: string;
  expiryDate: Date | null;
  createdAt: Date;
}

export interface VerificationStatusView {
  id: string;
  verificationType: VerificationType;
  status: VerificationStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationDetailsView extends VerificationStatusView {
  documents: VerificationDocumentView[];
  timeline: VerificationTimelineItem[];
}

export interface VerificationTimelineItem {
  id: string;
  oldStatus: VerificationStatus;
  newStatus: VerificationStatus;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
}

export interface VerificationHistoryItem {
  id: string;
  verificationType: VerificationType;
  status: VerificationStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  remarks: string | null;
  createdAt: Date;
}

export interface VerificationReviewNoteView {
  id: string;
  reviewerId: string;
  note: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface AdminVerificationListItem {
  id: string;
  userId: string;
  userEmail: string;
  username: string | null;
  verificationType: VerificationType;
  status: VerificationStatus;
  submittedAt: Date | null;
  createdAt: Date;
}

export interface VerificationProviderInput {
  verificationId: string;
  userId: string;
  documentType: DocumentType;
  frontImageKey: string;
  backImageKey?: string;
  selfieImageKey?: string;
}

export interface VerificationProviderResult {
  provider: string;
  success: boolean;
  confidenceScore?: number;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
}

export interface VerificationProvider {
  readonly name: string;
  verify(input: VerificationProviderInput): Promise<VerificationProviderResult>;
}

export interface UploadedVerificationFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

import { prisma } from '@database/index.js';
import type { DocumentType, NotificationType, Prisma, VerificationStatus, VerificationType } from '@prisma/client';

const verificationInclude = {
  documents: true,
  history: { orderBy: { createdAt: 'desc' as const } },
  user: { include: { profile: true } },
} satisfies Prisma.VerificationRequestInclude;

export type VerificationWithRelations = Prisma.VerificationRequestGetPayload<{
  include: typeof verificationInclude;
}>;

export class VerificationRepository {
  async findActiveByUserId(userId: string): Promise<VerificationWithRelations | null> {
    return prisma.verificationRequest.findFirst({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['PENDING', 'UNDER_REVIEW', 'RESUBMITTED'] },
      },
      include: verificationInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLatestByUserId(userId: string): Promise<VerificationWithRelations | null> {
    return prisma.verificationRequest.findFirst({
      where: { userId, deletedAt: null },
      include: verificationInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(verificationId: string): Promise<VerificationWithRelations | null> {
    return prisma.verificationRequest.findFirst({
      where: { id: verificationId, deletedAt: null },
      include: verificationInclude,
    });
  }

  async findByIdForUser(
    verificationId: string,
    userId: string,
  ): Promise<VerificationWithRelations | null> {
    return prisma.verificationRequest.findFirst({
      where: { id: verificationId, userId, deletedAt: null },
      include: verificationInclude,
    });
  }

  async listHistoryByUserId(userId: string, skip: number, take: number) {
    return prisma.verificationRequest.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async countHistoryByUserId(userId: string): Promise<number> {
    return prisma.verificationRequest.count({ where: { userId, deletedAt: null } });
  }

  async listAdminQueue(
    status: VerificationStatus | undefined,
    skip: number,
    take: number,
  ): Promise<VerificationWithRelations[]> {
    return prisma.verificationRequest.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : { status: { in: ['PENDING', 'UNDER_REVIEW', 'RESUBMITTED'] } }),
      },
      include: verificationInclude,
      orderBy: { submittedAt: 'asc' },
      skip,
      take,
    });
  }

  async countAdminQueue(status?: VerificationStatus): Promise<number> {
    return prisma.verificationRequest.count({
      where: {
        deletedAt: null,
        ...(status ? { status } : { status: { in: ['PENDING', 'UNDER_REVIEW', 'RESUBMITTED'] } }),
      },
    });
  }

  async createRequest(data: {
    userId: string;
    verificationType: VerificationType;
    status?: VerificationStatus;
  }): Promise<VerificationWithRelations> {
    return prisma.$transaction(async (tx) => {
      const request = await tx.verificationRequest.create({
        data: {
          userId: data.userId,
          verificationType: data.verificationType,
          status: data.status ?? 'PENDING',
          createdBy: data.userId,
        },
      });
      await tx.verificationHistory.create({
        data: {
          verificationId: request.id,
          oldStatus: 'PENDING',
          newStatus: data.status ?? 'PENDING',
          changedBy: data.userId,
          reason: 'Verification request created.',
        },
      });
      return tx.verificationRequest.findUniqueOrThrow({
        where: { id: request.id },
        include: verificationInclude,
      });
    });
  }

  async createDocument(data: {
    verificationId: string;
    documentType: DocumentType;
    frontImage?: string;
    backImage?: string;
    selfieImage?: string;
    documentNumber?: string;
    expiryDate?: Date;
  }) {
    return prisma.verificationDocument.create({
      data: {
        verificationId: data.verificationId,
        documentType: data.documentType,
        frontImage: data.frontImage ?? '',
        ...(data.backImage !== undefined && { backImage: data.backImage }),
        ...(data.selfieImage !== undefined && { selfieImage: data.selfieImage }),
        ...(data.documentNumber !== undefined && { documentNumber: data.documentNumber }),
        ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate }),
      },
    });
  }

  async updateDocument(
    documentId: string,
    data: Prisma.VerificationDocumentUpdateInput,
  ) {
    return prisma.verificationDocument.update({
      where: { id: documentId },
      data,
    });
  }

  async getPrimaryDocument(verificationId: string) {
    return prisma.verificationDocument.findFirst({
      where: { verificationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateStatus(data: {
    verificationId: string;
    oldStatus: VerificationStatus;
    newStatus: VerificationStatus;
    changedBy?: string;
    reason?: string;
    remarks?: string;
    reviewedBy?: string;
    submittedAt?: Date;
    reviewedAt?: Date;
  }): Promise<VerificationWithRelations> {
    return prisma.$transaction(async (tx) => {
      const updateData: Prisma.VerificationRequestUpdateInput = {
        status: data.newStatus,
      };
      if (data.remarks !== undefined) updateData.remarks = data.remarks;
      if (data.reviewedBy !== undefined) updateData.reviewer = { connect: { id: data.reviewedBy } };
      if (data.submittedAt !== undefined) updateData.submittedAt = data.submittedAt;
      if (data.reviewedAt !== undefined) updateData.reviewedAt = data.reviewedAt;
      if (data.changedBy !== undefined) updateData.updatedBy = data.changedBy;

      await tx.verificationRequest.update({
        where: { id: data.verificationId },
        data: updateData,
      });
      await tx.verificationHistory.create({
        data: {
          verificationId: data.verificationId,
          oldStatus: data.oldStatus,
          newStatus: data.newStatus,
          ...(data.changedBy !== undefined && { changedBy: data.changedBy }),
          ...(data.reason !== undefined && { reason: data.reason }),
        },
      });
      return tx.verificationRequest.findUniqueOrThrow({
        where: { id: data.verificationId },
        include: verificationInclude,
      });
    });
  }

  async addReviewNote(data: {
    verificationId: string;
    reviewerId: string;
    note: string;
    isInternal?: boolean;
  }) {
    return prisma.verificationReview.create({
      data: {
        verificationId: data.verificationId,
        reviewerId: data.reviewerId,
        note: data.note,
        isInternal: data.isInternal ?? true,
      },
    });
  }

  async listReviewNotes(verificationId: string) {
    return prisma.verificationReview.findMany({
      where: { verificationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listTimeline(verificationId: string) {
    return prisma.verificationHistory.findMany({
      where: { verificationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAuditLog(data: {
    userId?: string;
    action: string;
    entity: string;
    entityId: string;
    changes?: Record<string, unknown>;
    ip?: string;
    browser?: string;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        ...(data.userId !== undefined && { userId: data.userId }),
        ...(data.changes !== undefined && { changes: data.changes as Prisma.InputJsonValue }),
        ...(data.ip !== undefined && { ip: data.ip }),
        ...(data.browser !== undefined && { browser: data.browser }),
      },
    });
  }

  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    dataJson?: Record<string, unknown>;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: 'HIGH',
        ...(data.dataJson !== undefined && { dataJson: data.dataJson as Prisma.InputJsonValue }),
      },
    });
  }

  async updateTrustScoreOnApproval(userId: string): Promise<void> {
    await prisma.trustScore.upsert({
      where: { userId },
      create: { userId, score: 70, verifiedIdentity: true, level: 'TRUSTED' },
      update: { verifiedIdentity: true, score: { increment: 20 }, lastUpdated: new Date() },
    });
    await prisma.trustScoreHistory.create({
      data: {
        userId,
        oldScore: 50,
        newScore: 70,
        reason: 'VERIFICATION_APPROVED',
      },
    });
  }

  async getUserEmail(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? null;
  }
}

export const verificationRepository = new VerificationRepository();

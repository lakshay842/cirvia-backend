import { randomUUID } from 'node:crypto';
import type { DocumentType, VerificationDocument, VerificationStatus, VerificationType } from '@prisma/client';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@errors/index.js';
import { getRedisClient } from '@redis/index.js';
import { s3StorageProvider } from '../../../providers/storage/s3.provider.js';
import { encryptSensitive } from '../../../utils/encryption.util.js';
import { validateImageDimensions } from '../../../utils/image-dimension.util.js';
import { buildPaginationMeta, parsePagination } from '../../../utils/pagination.util.js';
import { verificationRepository } from '../repository/verification.repository.js';
import { hostsRepository } from '../../hosts/repository/hosts.repository.js';
import {
  toAdminListItemDto,
  toDetailsDto,
  toDocumentDto,
  toHistoryItemDto,
  toReviewNoteDto,
  toStatusDto,
  toTimelineDto,
} from '../dto/verification.dto.js';
import { VERIFICATION_CONSTANTS } from '../constants/verification.constants.js';
import { enqueueVerificationJob } from '../events/verification.queue.js';
import { emitVerificationEvent, VERIFICATION_EVENTS } from '../events/verification.events.js';
import type {
  AdminVerificationListQuery,
  InternalNoteInput,
  RejectVerificationInput,
  RequestReuploadInput,
  ResubmitVerificationInput,
  SubmitVerificationInput,
} from '../schemas/verification.schema.js';
import type { UploadedVerificationFile } from '../types/verification.types.js';

interface AuditContext {
  ip?: string;
  browser?: string;
}

export class VerificationService {
  async submitVerification(
    userId: string,
    input: SubmitVerificationInput,
    files: {
      governmentId?: UploadedVerificationFile;
      governmentIdBack?: UploadedVerificationFile;
      selfie?: UploadedVerificationFile;
    },
    audit?: AuditContext,
  ) {
    const active = await verificationRepository.findActiveByUserId(userId);
    if (active) {
      throw new ConflictError('An active verification request already exists.');
    }

    if (!files.governmentId || !files.selfie) {
      throw new ValidationError('Government ID and selfie are required.');
    }

    this.validateUploadFile(files.governmentId);
    this.validateUploadFile(files.selfie);
    if (files.governmentIdBack) this.validateUploadFile(files.governmentIdBack);

    const request = await verificationRepository.createRequest({
      userId,
      verificationType: input.verificationType,
      status: 'PENDING',
    });

    const documentType = input.verificationType as DocumentType;
    const frontKey = await this.uploadVerificationImage(userId, request.id, 'front', files.governmentId);
    const selfieKey = await this.uploadVerificationImage(userId, request.id, 'selfie', files.selfie);
    let backKey: string | undefined;
    if (files.governmentIdBack) {
      backKey = await this.uploadVerificationImage(
        userId,
        request.id,
        'back',
        files.governmentIdBack,
      );
    }

    await verificationRepository.createDocument({
      verificationId: request.id,
      documentType,
      frontImage: frontKey,
      ...(backKey !== undefined && { backImage: backKey }),
      selfieImage: selfieKey,
      ...(input.documentNumber !== undefined && {
        documentNumber: encryptSensitive(input.documentNumber),
      }),
      ...(input.expiryDate !== undefined && { expiryDate: new Date(input.expiryDate) }),
    });

    const updated = await verificationRepository.updateStatus({
      verificationId: request.id,
      oldStatus: 'PENDING',
      newStatus: 'UNDER_REVIEW',
      changedBy: userId,
      reason: 'Documents submitted for review.',
      submittedAt: new Date(),
    });

    await this.audit(userId, VERIFICATION_CONSTANTS.AUDIT_ACTIONS.SUBMITTED, request.id, audit);
    emitVerificationEvent(VERIFICATION_EVENTS.SUBMITTED, {
      verificationId: request.id,
      userId,
    });
    await this.enqueueJobs(request.id, userId);
    await this.invalidateCache(userId, request.id);

    return toStatusDto(updated);
  }

  async getStatus(userId: string) {
    const cached = await this.getCachedStatus(userId);
    if (cached) return cached;

    const latest = await verificationRepository.findLatestByUserId(userId);
    if (!latest) {
      return { status: null, message: 'No verification request found.' };
    }

    const dto = toStatusDto(latest);
    await this.cacheStatus(userId, dto);
    return { verification: dto };
  }

  async getDetails(userId: string, verificationId: string) {
    const request = await verificationRepository.findByIdForUser(verificationId, userId);
    if (!request) throw new NotFoundError('Verification request not found.');

    const documents = await this.mapDocumentsWithSignedUrls(request.documents);
    const timeline = request.history.map(toTimelineDto);
    return toDetailsDto(request, documents, timeline);
  }

  async getCurrentDetails(userId: string) {
    const request = await verificationRepository.findLatestByUserId(userId);
    if (!request) throw new NotFoundError('Verification request not found.');
    return this.getDetails(userId, request.id);
  }

  async uploadDocument(
    userId: string,
    verificationId: string,
    slot: 'front' | 'back' | 'selfie',
    file: UploadedVerificationFile,
    audit?: AuditContext,
  ) {
    const request = await verificationRepository.findByIdForUser(verificationId, userId);
    if (!request) throw new NotFoundError('Verification request not found.');
    if (!['PENDING', 'RESUBMITTED', 'REJECTED'].includes(request.status)) {
      throw new ForbiddenError('Documents cannot be uploaded for this verification status.');
    }

    this.validateUploadFile(file);
    const key = await this.uploadVerificationImage(userId, verificationId, slot, file);
    let document = await verificationRepository.getPrimaryDocument(verificationId);

    if (!document) {
      document = await verificationRepository.createDocument({
        verificationId,
        documentType: request.verificationType as DocumentType,
        frontImage: slot === 'front' ? key : '',
        ...(slot === 'back' && { backImage: key }),
        ...(slot === 'selfie' && { selfieImage: key }),
      });
    } else {
      const updateData =
        slot === 'front'
          ? { frontImage: key }
          : slot === 'back'
            ? { backImage: key }
            : { selfieImage: key };
      document = await verificationRepository.updateDocument(document.id, updateData);
    }

    await this.audit(
      userId,
      VERIFICATION_CONSTANTS.AUDIT_ACTIONS.DOCUMENT_UPLOADED,
      verificationId,
      audit,
      { slot },
    );
    await this.invalidateCache(userId, verificationId);
    return { message: `${slot} document uploaded successfully.`, documentId: document.id };
  }

  async resubmitVerification(
    userId: string,
    input: ResubmitVerificationInput,
    files?: {
      governmentId?: UploadedVerificationFile;
      governmentIdBack?: UploadedVerificationFile;
      selfie?: UploadedVerificationFile;
    },
    audit?: AuditContext,
  ) {
    const latest = await verificationRepository.findLatestByUserId(userId);
    if (!latest) throw new NotFoundError('No verification request to resubmit.');

    if (!VERIFICATION_CONSTANTS.RESUBMITTABLE_STATUSES.includes(
      latest.status as (typeof VERIFICATION_CONSTANTS.RESUBMITTABLE_STATUSES)[number],
    )) {
      throw new ForbiddenError('Only rejected, expired, or cancelled verifications can be resubmitted.');
    }

    const verificationType = (input.verificationType ?? latest.verificationType) as VerificationType;

    if (files?.governmentId && files?.selfie) {
      this.validateUploadFile(files.governmentId);
      this.validateUploadFile(files.selfie);
      if (files.governmentIdBack) this.validateUploadFile(files.governmentIdBack);

      const request = await verificationRepository.createRequest({
        userId,
        verificationType,
        status: 'RESUBMITTED',
      });

      const documentType = verificationType as DocumentType;
      const frontKey = await this.uploadVerificationImage(userId, request.id, 'front', files.governmentId);
      const selfieKey = await this.uploadVerificationImage(userId, request.id, 'selfie', files.selfie);
      let backKey: string | undefined;
      if (files.governmentIdBack) {
        backKey = await this.uploadVerificationImage(userId, request.id, 'back', files.governmentIdBack);
      }

      await verificationRepository.createDocument({
        verificationId: request.id,
        documentType,
        frontImage: frontKey,
        ...(backKey !== undefined && { backImage: backKey }),
        selfieImage: selfieKey,
        ...(input.documentNumber !== undefined && {
          documentNumber: encryptSensitive(input.documentNumber),
        }),
        ...(input.expiryDate !== undefined && { expiryDate: new Date(input.expiryDate) }),
      });

      const updated = await verificationRepository.updateStatus({
        verificationId: request.id,
        oldStatus: 'RESUBMITTED',
        newStatus: 'UNDER_REVIEW',
        changedBy: userId,
        reason: 'Verification resubmitted with documents.',
        submittedAt: new Date(),
      });

      await this.audit(userId, VERIFICATION_CONSTANTS.AUDIT_ACTIONS.RESUBMITTED, request.id, audit);
      await this.enqueueJobs(request.id, userId);
      await this.invalidateCache(userId, request.id);
      return toStatusDto(updated);
    }

    const request = await verificationRepository.createRequest({
      userId,
      verificationType,
      status: 'RESUBMITTED',
    });

    await verificationRepository.updateStatus({
      verificationId: request.id,
      oldStatus: 'RESUBMITTED',
      newStatus: 'PENDING',
      changedBy: userId,
      reason: 'Verification resubmitted.',
      submittedAt: new Date(),
    });

    await this.audit(userId, VERIFICATION_CONSTANTS.AUDIT_ACTIONS.RESUBMITTED, request.id, audit);
    await this.invalidateCache(userId, request.id);
    return toStatusDto(request);
  }

  async cancelVerification(userId: string, verificationId: string, audit?: AuditContext) {
    const request = await verificationRepository.findByIdForUser(verificationId, userId);
    if (!request) throw new NotFoundError('Verification request not found.');

    if (!VERIFICATION_CONSTANTS.ACTIVE_STATUSES.includes(request.status as 'PENDING')) {
      throw new ForbiddenError('Only active verification requests can be cancelled.');
    }

    const updated = await verificationRepository.updateStatus({
      verificationId,
      oldStatus: request.status,
      newStatus: 'CANCELLED',
      changedBy: userId,
      reason: 'Cancelled by user.',
    });

    await this.audit(userId, VERIFICATION_CONSTANTS.AUDIT_ACTIONS.CANCELLED, verificationId, audit);
    await this.invalidateCache(userId, verificationId);
    return toStatusDto(updated);
  }

  async getTimeline(userId: string, verificationId?: string) {
    const request = verificationId
      ? await verificationRepository.findByIdForUser(verificationId, userId)
      : await verificationRepository.findLatestByUserId(userId);
    if (!request) throw new NotFoundError('Verification request not found.');

    const timeline = await verificationRepository.listTimeline(request.id);
    return { timeline: timeline.map(toTimelineDto) };
  }

  async getHistory(userId: string, query: { page?: number; limit?: number }) {
    const input: { page?: number; limit?: number } = {};
    if (query.page !== undefined) input.page = query.page;
    if (query.limit !== undefined) input.limit = query.limit;
    const { page, limit, skip } = parsePagination(input, {
      page: VERIFICATION_CONSTANTS.DEFAULT_PAGE,
      limit: VERIFICATION_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: VERIFICATION_CONSTANTS.MAX_LIMIT,
    });
    const [rows, total] = await Promise.all([
      verificationRepository.listHistoryByUserId(userId, skip, limit),
      verificationRepository.countHistoryByUserId(userId),
    ]);
    return {
      history: rows.map(toHistoryItemDto),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async listPendingVerifications(query: AdminVerificationListQuery) {
    const input: { page?: number; limit?: number } = {};
    if (query.page !== undefined) input.page = query.page;
    if (query.limit !== undefined) input.limit = query.limit;
    const status = query.status as VerificationStatus | undefined;
    const { page, limit, skip } = parsePagination(input, {
      page: VERIFICATION_CONSTANTS.DEFAULT_PAGE,
      limit: VERIFICATION_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: VERIFICATION_CONSTANTS.MAX_LIMIT,
    });
    const [rows, total] = await Promise.all([
      verificationRepository.listAdminQueue(status, skip, limit),
      verificationRepository.countAdminQueue(status),
    ]);
    return {
      verifications: rows.map(toAdminListItemDto),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getAdminDetails(verificationId: string, adminId: string, audit?: AuditContext) {
    const request = await verificationRepository.findById(verificationId);
    if (!request) throw new NotFoundError('Verification request not found.');

    const documents = await this.mapDocumentsWithSignedUrls(request.documents);
    const timeline = request.history.map(toTimelineDto);
    const notes = (await verificationRepository.listReviewNotes(verificationId)).map(toReviewNoteDto);

    await this.audit(
      adminId,
      VERIFICATION_CONSTANTS.AUDIT_ACTIONS.ADMIN_VIEWED_DOCUMENTS,
      verificationId,
      audit,
    );

    return { ...toDetailsDto(request, documents, timeline), internalNotes: notes };
  }

  async approveVerification(verificationId: string, adminId: string, audit?: AuditContext) {
    const request = await verificationRepository.findById(verificationId);
    if (!request) throw new NotFoundError('Verification request not found.');
    if (!['PENDING', 'UNDER_REVIEW', 'RESUBMITTED'].includes(request.status)) {
      throw new ForbiddenError('Verification cannot be approved in its current status.');
    }

    const updated = await verificationRepository.updateStatus({
      verificationId,
      oldStatus: request.status,
      newStatus: 'APPROVED',
      changedBy: adminId,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      reason: 'Approved by admin.',
    });

    await verificationRepository.updateTrustScoreOnApproval(request.userId);
    await hostsRepository.updateVerificationStatusByUserId(request.userId, 'APPROVED');
    await this.audit(adminId, VERIFICATION_CONSTANTS.AUDIT_ACTIONS.APPROVED, verificationId, audit);
    emitVerificationEvent(VERIFICATION_EVENTS.APPROVED, {
      verificationId,
      userId: request.userId,
    });
    await this.invalidateCache(request.userId, verificationId);
    return toStatusDto(updated);
  }

  async rejectVerification(
    verificationId: string,
    adminId: string,
    input: RejectVerificationInput,
    audit?: AuditContext,
  ) {
    const request = await verificationRepository.findById(verificationId);
    if (!request) throw new NotFoundError('Verification request not found.');

    const updated = await verificationRepository.updateStatus({
      verificationId,
      oldStatus: request.status,
      newStatus: 'REJECTED',
      changedBy: adminId,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      reason: input.reason,
      remarks: input.reason,
    });

    await this.audit(adminId, VERIFICATION_CONSTANTS.AUDIT_ACTIONS.REJECTED, verificationId, audit, {
      reason: input.reason,
    });
    await hostsRepository.updateVerificationStatusByUserId(request.userId, 'REJECTED');
    emitVerificationEvent(VERIFICATION_EVENTS.REJECTED, {
      verificationId,
      userId: request.userId,
      reason: input.reason,
    });
    await this.invalidateCache(request.userId, verificationId);
    return toStatusDto(updated);
  }

  async requestReupload(
    verificationId: string,
    adminId: string,
    input: RequestReuploadInput,
    audit?: AuditContext,
  ) {
    const request = await verificationRepository.findById(verificationId);
    if (!request) throw new NotFoundError('Verification request not found.');

    const updated = await verificationRepository.updateStatus({
      verificationId,
      oldStatus: request.status,
      newStatus: 'RESUBMITTED',
      changedBy: adminId,
      reviewedBy: adminId,
      reason: input.reason,
      remarks: input.reason,
    });

    await this.audit(
      adminId,
      VERIFICATION_CONSTANTS.AUDIT_ACTIONS.REUPLOAD_REQUESTED,
      verificationId,
      audit,
      { requiredDocuments: input.requiredDocuments },
    );
    const { notificationsService } = await import('../../notifications/service/notifications.service.js');
    const { NOTIFICATIONS_CONSTANTS } = await import('../../notifications/constants/notifications.constants.js');
    await notificationsService.dispatch({
      userId: request.userId,
      type: 'VERIFICATION',
      category: NOTIFICATIONS_CONSTANTS.CATEGORIES.KYC,
      title: 'Re-upload Required',
      message: input.reason,
      priority: 'HIGH',
      dataJson: { verificationId },
      trigger: VERIFICATION_EVENTS.REUPLOAD_REQUESTED,
    });
    await this.invalidateCache(request.userId, verificationId);
    return toStatusDto(updated);
  }

  async addInternalNote(
    verificationId: string,
    adminId: string,
    input: InternalNoteInput,
    audit?: AuditContext,
  ) {
    const request = await verificationRepository.findById(verificationId);
    if (!request) throw new NotFoundError('Verification request not found.');

    const note = await verificationRepository.addReviewNote({
      verificationId,
      reviewerId: adminId,
      note: input.note,
      isInternal: true,
    });

    await this.audit(
      adminId,
      VERIFICATION_CONSTANTS.AUDIT_ACTIONS.INTERNAL_NOTE_ADDED,
      verificationId,
      audit,
    );
    return toReviewNoteDto(note);
  }

  async getAdminTimeline(verificationId: string) {
    const request = await verificationRepository.findById(verificationId);
    if (!request) throw new NotFoundError('Verification request not found.');
    const timeline = await verificationRepository.listTimeline(verificationId);
    const notes = (await verificationRepository.listReviewNotes(verificationId)).map(toReviewNoteDto);
    return { timeline: timeline.map(toTimelineDto), internalNotes: notes };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private validateUploadFile(file: UploadedVerificationFile): void {
    if (!VERIFICATION_CONSTANTS.ALLOWED_IMAGE_MIMES.includes(
      file.mimetype as (typeof VERIFICATION_CONSTANTS.ALLOWED_IMAGE_MIMES)[number],
    )) {
      throw new ValidationError('Invalid file type. Allowed: jpg, jpeg, png, webp.');
    }
    if (file.size > VERIFICATION_CONSTANTS.MAX_UPLOAD_BYTES) {
      throw new ValidationError('File size exceeds 10 MB limit.');
    }
    validateImageDimensions(file.buffer, {
      minWidth: VERIFICATION_CONSTANTS.MIN_IMAGE_WIDTH,
      minHeight: VERIFICATION_CONSTANTS.MIN_IMAGE_HEIGHT,
      maxWidth: VERIFICATION_CONSTANTS.MAX_IMAGE_WIDTH,
      maxHeight: VERIFICATION_CONSTANTS.MAX_IMAGE_HEIGHT,
    });
  }

  private async uploadVerificationImage(
    userId: string,
    verificationId: string,
    slot: string,
    file: UploadedVerificationFile,
  ): Promise<string> {
    const fileName = `${userId}/${verificationId}/${slot}-${randomUUID()}.jpg`;
    const result = await s3StorageProvider.uploadPrivateFile(
      VERIFICATION_CONSTANTS.S3_FOLDER,
      fileName,
      file.buffer,
      file.mimetype,
    );
    return result.key;
  }

  private async mapDocumentsWithSignedUrls(documents: VerificationDocument[]) {
    const results = [];
    for (const doc of documents) {
      if (!doc) continue;
      const signed: { front?: string; back?: string; selfie?: string } = {};
      if (doc.frontImage) {
        signed.front = await s3StorageProvider.getSignedUrl(
          s3StorageProvider.extractKeyFromStoredValue(doc.frontImage),
          VERIFICATION_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS,
        );
      }
      if (doc.backImage) {
        signed.back = await s3StorageProvider.getSignedUrl(
          s3StorageProvider.extractKeyFromStoredValue(doc.backImage),
          VERIFICATION_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS,
        );
      }
      if (doc.selfieImage) {
        signed.selfie = await s3StorageProvider.getSignedUrl(
          s3StorageProvider.extractKeyFromStoredValue(doc.selfieImage),
          VERIFICATION_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS,
        );
      }
      results.push(toDocumentDto(doc, signed));
    }
    return results;
  }

  private async audit(
    userId: string,
    action: string,
    entityId: string,
    audit?: AuditContext,
    changes?: Record<string, unknown>,
  ): Promise<void> {
    await verificationRepository.createAuditLog({
      userId,
      action,
      entity: 'verification_request',
      entityId,
      ...(changes !== undefined && { changes }),
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
  }

  private async enqueueJobs(verificationId: string, userId: string): Promise<void> {
    await enqueueVerificationJob({
      verificationId,
      userId,
      jobType: VERIFICATION_CONSTANTS.JOB_TYPES.DOCUMENT_VALIDATION,
      provider: VERIFICATION_CONSTANTS.PROVIDERS.MANUAL,
    });
  }

  private async cacheStatus(userId: string, status: unknown): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.setex(
        VERIFICATION_CONSTANTS.REDIS_KEYS.statusCache(userId),
        VERIFICATION_CONSTANTS.STATUS_CACHE_TTL_SECONDS,
        JSON.stringify(status),
      );
    } catch {
      // optional
    }
  }

  private async getCachedStatus(userId: string) {
    try {
      const redis = getRedisClient();
      const raw = await redis.get(VERIFICATION_CONSTANTS.REDIS_KEYS.statusCache(userId));
      if (!raw) return null;
      return JSON.parse(raw) as { verification: unknown };
    } catch {
      return null;
    }
  }

  private async invalidateCache(userId: string, verificationId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(
        VERIFICATION_CONSTANTS.REDIS_KEYS.statusCache(userId),
        VERIFICATION_CONSTANTS.REDIS_KEYS.detailsCache(verificationId),
      );
    } catch {
      // optional
    }
  }
}

export const verificationService = new VerificationService();

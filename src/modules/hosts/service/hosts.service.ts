import { randomUUID } from 'node:crypto';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedActionError,
  ValidationError,
} from '@errors/index.js';
import { getRedisClient } from '@redis/index.js';
import { emailService } from '../../../services/email.service.js';
import { s3StorageProvider } from '../../../providers/storage/s3.provider.js';
import { buildPaginationMeta, parsePagination } from '../../../utils/pagination.util.js';
import { sanitizeString } from '../../../utils/sanitize.util.js';
import { validateImageDimensions } from '../../../utils/image-dimension.util.js';
import { HOST_CONSTANTS } from '../constants/hosts.constants.js';
import { hostsRepository, type HostWithRelations } from '../repository/hosts.repository.js';
import {
  toActivityDto,
  toBadgeDto,
  toDashboardDto,
  toPreferencesDto,
  toPrivateProfileDto,
  toProfileCompletionDto,
  toPublicProfileDto,
  toStatisticsDto,
} from '../dto/hosts.dto.js';
import { emitHostEvent } from '../events/hosts.events.js';
import type {
  BecomeHostInput,
  UpdateHostProfileInput,
  UpdateHostAddressInput,
  UpdateEmergencyContactInput,
  UpdateHostPreferencesInput,
  UpdateAvailabilityInput,
  UpdateSocialLinksInput,
  AdminHostListQuery,
  RejectHostInput,
} from '../schemas/hosts.schema.js';
import type { UploadedHostFile } from '../types/hosts.types.js';
import type { HostDocumentType } from '@prisma/client';

interface AuditMeta {
  ip?: string;
  browser?: string;
}

export class HostsService {
  async becomeHost(userId: string, input: BecomeHostInput, audit?: AuditMeta) {
    if (await hostsRepository.userHasHostProfile(userId)) {
      throw new ConflictError('You already have a host profile.');
    }

    const displayName =
      input.displayName ??
      (await this.resolveDisplayName(userId)) ??
      `Host-${userId.slice(0, 8)}`;
    const slug = await this.generateUniqueSlug(displayName, userId);

    const host = await hostsRepository.createHost({
      userId,
      slug,
      displayName: sanitizeString(displayName),
      bio: sanitizeString(input.bio),
      hostingExperience: sanitizeString(input.experience),
      languages: input.languages.map(sanitizeString),
      interests: (input.interests ?? []).map(sanitizeString),
      emergencyContactName: sanitizeString(input.emergencyContact.name),
      emergencyContactPhone: sanitizeString(input.emergencyContact.phone),
      address: {
        addressLine1: sanitizeString(input.address.addressLine1),
        city: sanitizeString(input.address.city),
        state: sanitizeString(input.address.state),
        country: sanitizeString(input.address.country),
        postalCode: sanitizeString(input.address.postalCode),
        ...(input.address.addressLine2 !== undefined && {
          addressLine2: sanitizeString(input.address.addressLine2),
        }),
        ...(input.address.landmark !== undefined && {
          landmark: sanitizeString(input.address.landmark),
        }),
        ...(input.address.latitude !== undefined && { latitude: input.address.latitude }),
        ...(input.address.longitude !== undefined && { longitude: input.address.longitude }),
      },
    });

    await hostsRepository.createActivity(
      host.id,
      HOST_CONSTANTS.ACTIVITY_TYPES.BECOME_HOST,
      { slug },
    );
    await hostsRepository.createAuditLog({
      userId,
      action: HOST_CONSTANTS.AUDIT_ACTIONS.BECOME_HOST,
      entityId: host.id,
      changes: { slug, accountStatus: 'PENDING' },
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });

    const email = await hostsRepository.getUserEmail(userId);
    if (email) await emailService.sendHostWelcome(email, displayName);

    emitHostEvent('host.created', { hostId: host.id, userId });

    return this.buildPrivateProfile(host);
  }

  async getMyProfile(userId: string) {
    const host = await this.requireHostByUserId(userId);
    return this.buildPrivateProfile(host);
  }

  async updateProfile(userId: string, input: UpdateHostProfileInput, audit?: AuditMeta) {
    const host = await this.requireActiveHostByUserId(userId);

    const data: Record<string, unknown> = {};
    if (input.displayName !== undefined) data.displayName = sanitizeString(input.displayName);
    if (input.bio !== undefined) data.bio = sanitizeString(input.bio);
    if (input.about !== undefined) data.about = sanitizeString(input.about);
    if (input.occupation !== undefined) data.occupation = sanitizeString(input.occupation);
    if (input.experience !== undefined) data.hostingExperience = sanitizeString(input.experience);
    if (input.languages !== undefined) data.languages = input.languages.map(sanitizeString);
    if (input.interests !== undefined) data.interests = input.interests.map(sanitizeString);
    if (input.responseTime !== undefined) data.responseTime = input.responseTime;

    const updated = await hostsRepository.updateHost(host.id, userId, data);
    await hostsRepository.createActivity(host.id, HOST_CONSTANTS.ACTIVITY_TYPES.PROFILE_UPDATED);
    await hostsRepository.createAuditLog({
      userId,
      action: HOST_CONSTANTS.AUDIT_ACTIONS.PROFILE_UPDATE,
      entityId: host.id,
      changes: data,
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    const { notificationsService } = await import('../../notifications/service/notifications.service.js');
    const { NOTIFICATIONS_CONSTANTS } = await import('../../notifications/constants/notifications.constants.js');
    await notificationsService.dispatch({
      userId,
      type: 'VERIFICATION',
      category: NOTIFICATIONS_CONSTANTS.CATEGORIES.HOST,
      title: 'Profile Updated',
      message: 'Your host profile has been updated.',
      priority: 'NORMAL',
    });
    await this.invalidateCache(host.slug, host.id);
    emitHostEvent('host.profile.updated', { hostId: host.id, userId });

    return this.buildPrivateProfile(updated);
  }

  async getPublicProfile(slug: string) {
    const cached = await this.getCachedPublicProfile(slug);
    if (cached) return cached;

    const host = await hostsRepository.findBySlug(slug, true);
    if (!host) throw new NotFoundError('Host not found.');

    const prefs = toPreferencesDto(host.preferencesJson);
    if (!prefs.publicProfile) throw new NotFoundError('Host not found.');

    const profile = await this.buildPublicProfile(host);
    await this.cachePublicProfile(slug, profile);
    return profile;
  }

  async getViewableProfile(slug: string, userId?: string) {
    try {
      return await this.getPublicProfile(slug);
    } catch (error) {
      if (!(error instanceof NotFoundError) || !userId) {
        throw error;
      }
    }

    const host = await hostsRepository.findBySlug(slug, false);
    if (!host) throw new NotFoundError('Host not found.');

    if (host.userId !== userId) {
      throw new NotFoundError('Host not found.');
    }

    const profile = await this.buildPublicProfile(host);
    return { ...profile, isPreview: true };
  }

  async getVerificationStatus(userId: string) {
    const host = await this.requireHostByUserId(userId);
    const kycStatus = await hostsRepository.getKycStatus(userId);
    return {
      accountStatus: host.accountStatus,
      verificationStatus: host.verificationStatus,
      kycStatus,
      isVerified: host.accountStatus === 'VERIFIED',
    };
  }

  async getDashboard(userId: string) {
    const host = await this.requireHostByUserId(userId);
    const stats = await this.getStatisticsInternal(host);
    const completion = this.calculateProfileCompletion(host);
    const pendingTasks = this.buildPendingTasks(host, completion);

    const activities = await hostsRepository.listActivities(host.id, 0, 10);
    const dashboard = toDashboardDto({
      statistics: stats,
      profileCompletion: completion.percentage,
      verificationStatus: host.verificationStatus,
      accountStatus: host.accountStatus,
      pendingTasks,
      recentActivity: activities.map(toActivityDto),
      upcomingEventsPlaceholder: host.analytics?.upcomingEvents ?? 0,
    });
    return dashboard;
  }

  async getStatistics(userId: string) {
    const host = await this.requireHostByUserId(userId);
    const cached = await this.getCachedStatistics(host.id);
    if (cached) return cached;
    const stats = await this.getStatisticsInternal(host);
    await this.cacheStatistics(host.id, stats);
    return stats;
  }

  async getAnalytics(userId: string) {
    const host = await this.requireHostByUserId(userId);
    const stats = await this.getStatisticsInternal(host);
    return {
      ...stats,
      cancellationRate: Number(host.analytics?.cancellationRate ?? 0),
      attendance: host.analytics?.attendance ?? 0,
      earnings: Number(host.analytics?.earnings ?? 0),
    };
  }

  async getBadges(userId: string) {
    const host = await this.requireHostByUserId(userId);
    return host.badges.map(toBadgeDto);
  }

  async getPreferences(userId: string) {
    const host = await this.requireHostByUserId(userId);
    return toPreferencesDto(host.preferencesJson);
  }

  async updatePreferences(userId: string, input: UpdateHostPreferencesInput) {
    const host = await this.requireActiveHostByUserId(userId);
    const current = toPreferencesDto(host.preferencesJson);
    const merged = { ...current, ...input };
    const updated = await hostsRepository.updateHost(host.id, userId, {
      preferencesJson: merged,
    });
    await this.invalidateCache(host.slug, host.id);
    return toPreferencesDto(updated.preferencesJson);
  }

  async getAddress(userId: string) {
    const host = await this.requireHostByUserId(userId);
    const address = host.addresses[0];
    if (!address) return null;
    return {
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      country: address.country,
      postalCode: address.postalCode,
      latitude: address.latitude ? Number(address.latitude) : null,
      longitude: address.longitude ? Number(address.longitude) : null,
    };
  }

  async updateAddress(userId: string, input: UpdateHostAddressInput, audit?: AuditMeta) {
    const host = await this.requireActiveHostByUserId(userId);
    await hostsRepository.upsertAddress(host.id, {
      addressLine1: sanitizeString(input.addressLine1),
      city: sanitizeString(input.city),
      state: sanitizeString(input.state),
      country: sanitizeString(input.country),
      postalCode: sanitizeString(input.postalCode),
      ...(input.addressLine2 !== undefined && { addressLine2: sanitizeString(input.addressLine2) }),
      ...(input.landmark !== undefined && { landmark: sanitizeString(input.landmark) }),
      ...(input.latitude !== undefined && { latitude: input.latitude }),
      ...(input.longitude !== undefined && { longitude: input.longitude }),
    });
    await hostsRepository.createAuditLog({
      userId,
      action: HOST_CONSTANTS.AUDIT_ACTIONS.PROFILE_UPDATE,
      entityId: host.id,
      changes: { section: 'address' },
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    await this.invalidateCache(host.slug, host.id);
    return this.getAddress(userId);
  }

  async getEmergencyContact(userId: string) {
    const host = await this.requireHostByUserId(userId);
    if (!host.emergencyContactName || !host.emergencyContactPhone) return null;
    return { name: host.emergencyContactName, phone: host.emergencyContactPhone };
  }

  async updateEmergencyContact(
    userId: string,
    input: UpdateEmergencyContactInput,
    audit?: AuditMeta,
  ) {
    const host = await this.requireActiveHostByUserId(userId);
    await hostsRepository.updateHost(host.id, userId, {
      emergencyContactName: sanitizeString(input.name),
      emergencyContactPhone: sanitizeString(input.phone),
    });
    await hostsRepository.createAuditLog({
      userId,
      action: HOST_CONSTANTS.AUDIT_ACTIONS.PROFILE_UPDATE,
      entityId: host.id,
      changes: { section: 'emergencyContact' },
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    await this.invalidateCache(host.slug, host.id);
    return { name: input.name, phone: input.phone };
  }

  async getSocialLinks(userId: string) {
    const host = await this.requireHostByUserId(userId);
    return {
      instagram: host.instagram,
      linkedin: host.linkedin,
      twitter: host.twitter,
      website: host.website,
    };
  }

  async updateSocialLinks(userId: string, input: UpdateSocialLinksInput) {
    const host = await this.requireActiveHostByUserId(userId);
    const data: Record<string, string | null> = {};
    for (const key of ['instagram', 'linkedin', 'twitter', 'website'] as const) {
      if (input[key] !== undefined) data[key] = input[key] === '' ? null : input[key]!;
    }
    const updated = await hostsRepository.updateHost(host.id, userId, data);
    await this.invalidateCache(host.slug, host.id);
    return {
      instagram: updated.instagram,
      linkedin: updated.linkedin,
      twitter: updated.twitter,
      website: updated.website,
    };
  }

  async getAvailability(userId: string) {
    const host = await this.requireHostByUserId(userId);
    return Array.isArray(host.availabilityJson) ? host.availabilityJson : [];
  }

  async updateAvailability(userId: string, input: UpdateAvailabilityInput) {
    const host = await this.requireActiveHostByUserId(userId);
    await hostsRepository.updateHost(host.id, userId, {
      availabilityJson: input.availability,
    });
    return input.availability;
  }

  async uploadAvatar(userId: string, file: UploadedHostFile, audit?: AuditMeta) {
    const host = await this.requireActiveHostByUserId(userId);
    this.validateImageFile(file);
    const fileName = `${host.id}-avatar-${randomUUID()}.${this.extensionFromMime(file.mimetype)}`;
    const result = await s3StorageProvider.uploadFile(
      HOST_CONSTANTS.S3_AVATAR_FOLDER,
      fileName,
      file.buffer,
      file.mimetype,
    );
    await hostsRepository.updateHost(host.id, userId, { profileImage: result.key });
    await hostsRepository.addMedia(host.id, 'AVATAR', result.key);
    await this.recordMediaUpload(host, userId, 'avatar', audit);
    await this.invalidateCache(host.slug, host.id);
    const url = await s3StorageProvider.getSignedUrl(
      result.key,
      HOST_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS,
    );
    return { key: result.key, url };
  }

  async uploadCover(userId: string, file: UploadedHostFile, audit?: AuditMeta) {
    const host = await this.requireActiveHostByUserId(userId);
    this.validateImageFile(file);
    const fileName = `${host.id}-cover-${randomUUID()}.${this.extensionFromMime(file.mimetype)}`;
    const result = await s3StorageProvider.uploadFile(
      HOST_CONSTANTS.S3_COVER_FOLDER,
      fileName,
      file.buffer,
      file.mimetype,
    );
    await hostsRepository.updateHost(host.id, userId, { coverImage: result.key });
    await hostsRepository.addMedia(host.id, 'COVER', result.key);
    await this.recordMediaUpload(host, userId, 'cover', audit);
    await this.invalidateCache(host.slug, host.id);
    const url = await s3StorageProvider.getSignedUrl(
      result.key,
      HOST_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS,
    );
    return { key: result.key, url };
  }

  async uploadGallery(userId: string, file: UploadedHostFile, audit?: AuditMeta) {
    const host = await this.requireActiveHostByUserId(userId);
    this.validateImageFile(file);
    const gallery = await hostsRepository.listGallery(host.id);
    if (gallery.length >= HOST_CONSTANTS.MAX_GALLERY_ITEMS) {
      throw new ValidationError(`Gallery limit of ${HOST_CONSTANTS.MAX_GALLERY_ITEMS} reached.`);
    }
    const fileName = `${host.id}-gallery-${randomUUID()}.${this.extensionFromMime(file.mimetype)}`;
    const result = await s3StorageProvider.uploadFile(
      HOST_CONSTANTS.S3_GALLERY_FOLDER,
      fileName,
      file.buffer,
      file.mimetype,
    );
    const media = await hostsRepository.addMedia(
      host.id,
      'GALLERY',
      result.key,
      gallery.length,
    );
    await this.recordMediaUpload(host, userId, 'gallery', audit);
    await this.invalidateCache(host.slug, host.id);
    const url = await s3StorageProvider.getSignedUrl(
      result.key,
      HOST_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS,
    );
    return { id: media.id, key: result.key, url };
  }

  async deleteGalleryItem(userId: string, mediaId: string) {
    const host = await this.requireActiveHostByUserId(userId);
    const deleted = await hostsRepository.deleteMedia(mediaId, host.id);
    if (!deleted) throw new NotFoundError('Gallery item not found.');
    await this.invalidateCache(host.slug, host.id);
    return { deleted: true };
  }

  async uploadDocuments(
    userId: string,
    files: { identityProof?: UploadedHostFile; addressProof?: UploadedHostFile },
    audit?: AuditMeta,
  ) {
    const host = await this.requireActiveHostByUserId(userId);
    const uploaded: Array<{ documentType: HostDocumentType; id: string }> = [];

    if (files.identityProof) {
      this.validateDocumentFile(files.identityProof);
      const doc = await this.uploadDocument(host.id, 'IDENTITY_PROOF', files.identityProof);
      uploaded.push({ documentType: 'IDENTITY_PROOF', id: doc.id });
    }
    if (files.addressProof) {
      this.validateDocumentFile(files.addressProof);
      const doc = await this.uploadDocument(host.id, 'ADDRESS_PROOF', files.addressProof);
      uploaded.push({ documentType: 'ADDRESS_PROOF', id: doc.id });
    }
    if (uploaded.length === 0) {
      throw new ValidationError('At least one document is required.');
    }

    await hostsRepository.createActivity(
      host.id,
      HOST_CONSTANTS.ACTIVITY_TYPES.DOCUMENT_UPLOADED,
      { count: uploaded.length },
    );
    await hostsRepository.createAuditLog({
      userId,
      action: HOST_CONSTANTS.AUDIT_ACTIONS.DOCUMENT_UPLOAD,
      entityId: host.id,
      changes: { documents: uploaded.map((d) => d.documentType) },
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    const { notificationsService } = await import('../../notifications/service/notifications.service.js');
    const { NOTIFICATIONS_CONSTANTS } = await import('../../notifications/constants/notifications.constants.js');
    await notificationsService.dispatch({
      userId,
      type: 'VERIFICATION',
      category: NOTIFICATIONS_CONSTANTS.CATEGORIES.HOST,
      title: 'Verification Required',
      message: 'Your documents have been submitted and are pending review.',
      priority: 'NORMAL',
    });

    return { documents: uploaded };
  }

  async listDocuments(userId: string) {
    const host = await this.requireHostByUserId(userId);
    const docs = await hostsRepository.listDocuments(host.id);
    return Promise.all(
      docs.map(async (doc) => ({
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        status: doc.status,
        createdAt: doc.createdAt,
        url: await s3StorageProvider.getSignedUrl(
          doc.storageKey,
          HOST_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS,
        ),
      })),
    );
  }

  async getTimeline(userId: string) {
    const host = await this.requireHostByUserId(userId);
    const activities = await hostsRepository.listActivities(host.id, 0, 50);
    return activities.map(toActivityDto);
  }

  async getActivity(userId: string, query: { page?: number; limit?: number }) {
    const host = await this.requireHostByUserId(userId);
    const paginationInput: { page?: number; limit?: number } = {};
    if (query.page !== undefined) paginationInput.page = query.page;
    if (query.limit !== undefined) paginationInput.limit = query.limit;
    const { page, limit, skip } = parsePagination(paginationInput, {
      page: HOST_CONSTANTS.DEFAULT_PAGE,
      limit: HOST_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: HOST_CONSTANTS.MAX_LIMIT,
    });
    const [items, total] = await Promise.all([
      hostsRepository.listActivities(host.id, skip, limit),
      hostsRepository.countActivities(host.id),
    ]);
    return {
      items: items.map(toActivityDto),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getProfileCompletion(userId: string) {
    const host = await this.requireHostByUserId(userId);
    return this.calculateProfileCompletion(host);
  }

  async deactivate(userId: string, audit?: AuditMeta) {
    const host = await this.requireHostByUserId(userId);
    if (host.accountStatus === 'INACTIVE') {
      throw new ConflictError('Host profile is already inactive.');
    }
    if (host.accountStatus === 'DELETED') {
      throw new UnauthorizedActionError('Cannot deactivate a deleted profile.');
    }
    await hostsRepository.updateAccountStatus(host.id, 'INACTIVE', undefined, userId);
    await hostsRepository.createActivity(host.id, HOST_CONSTANTS.ACTIVITY_TYPES.STATUS_CHANGED, {
      status: 'INACTIVE',
    });
    await hostsRepository.createAuditLog({
      userId,
      action: HOST_CONSTANTS.AUDIT_ACTIONS.DEACTIVATED,
      entityId: host.id,
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    await this.invalidateCache(host.slug, host.id);
    return { accountStatus: 'INACTIVE' as const };
  }

  async reactivate(userId: string, audit?: AuditMeta) {
    const host = await this.requireHostByUserId(userId);
    if (host.accountStatus !== 'INACTIVE') {
      throw new ConflictError('Only inactive profiles can be reactivated.');
    }
    const newStatus =
      host.verificationStatus === 'APPROVED' ? ('VERIFIED' as const) : ('PENDING' as const);
    await hostsRepository.updateAccountStatus(host.id, newStatus, undefined, userId);
    await hostsRepository.createActivity(host.id, HOST_CONSTANTS.ACTIVITY_TYPES.STATUS_CHANGED, {
      status: newStatus,
    });
    await hostsRepository.createAuditLog({
      userId,
      action: HOST_CONSTANTS.AUDIT_ACTIONS.REACTIVATED,
      entityId: host.id,
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    await this.invalidateCache(host.slug, host.id);
    return { accountStatus: newStatus };
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async listAdminHosts(query: AdminHostListQuery) {
    const paginationInput: { page?: number; limit?: number } = {};
    if (query.page !== undefined) paginationInput.page = query.page;
    if (query.limit !== undefined) paginationInput.limit = query.limit;
    const { page, limit, skip } = parsePagination(paginationInput, {
      page: HOST_CONSTANTS.DEFAULT_PAGE,
      limit: HOST_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: HOST_CONSTANTS.MAX_LIMIT,
    });
    const [hosts, total] = await Promise.all([
      hostsRepository.listAdminHosts(query.status, skip, limit),
      hostsRepository.countAdminHosts(query.status),
    ]);
    return {
      items: await Promise.all(hosts.map((h) => this.buildPrivateProfile(h))),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getAdminHostDetails(hostId: string) {
    const host = await hostsRepository.findById(hostId);
    if (!host) throw new NotFoundError('Host not found.');
    return this.buildPrivateProfile(host);
  }

  async approveHost(hostId: string, adminId: string, audit?: AuditMeta) {
    const host = await hostsRepository.findById(hostId);
    if (!host) throw new NotFoundError('Host not found.');
    if (host.accountStatus === 'VERIFIED') {
      throw new ConflictError('Host is already verified.');
    }

    const updated = await hostsRepository.updateAccountStatus(
      hostId,
      'VERIFIED',
      'APPROVED',
      adminId,
    );
    await hostsRepository.addBadge(hostId, 'VERIFIED_HOST');
    await hostsRepository.createAuditLog({
      userId: adminId,
      action: HOST_CONSTANTS.AUDIT_ACTIONS.VERIFICATION_CHANGE,
      entityId: hostId,
      changes: { accountStatus: 'VERIFIED', verificationStatus: 'APPROVED' },
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    await this.invalidateCache(host.slug, host.id);
    emitHostEvent('host.approved', { hostId, userId: host.userId });

    return this.buildPrivateProfile(updated);
  }

  async rejectHost(hostId: string, adminId: string, input: RejectHostInput, audit?: AuditMeta) {
    const host = await hostsRepository.findById(hostId);
    if (!host) throw new NotFoundError('Host not found.');

    const updated = await hostsRepository.updateAccountStatus(
      hostId,
      'REJECTED',
      'REJECTED',
      adminId,
    );
    await hostsRepository.createAuditLog({
      userId: adminId,
      action: HOST_CONSTANTS.AUDIT_ACTIONS.VERIFICATION_CHANGE,
      entityId: hostId,
      changes: { accountStatus: 'REJECTED', reason: input.reason },
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    await this.invalidateCache(host.slug, host.id);
    emitHostEvent('host.rejected', { hostId, userId: host.userId, reason: input.reason });

    return this.buildPrivateProfile(updated);
  }

  async suspendHost(hostId: string, adminId: string, audit?: AuditMeta) {
    const host = await hostsRepository.findById(hostId);
    if (!host) throw new NotFoundError('Host not found.');

    const updated = await hostsRepository.updateAccountStatus(
      hostId,
      'SUSPENDED',
      undefined,
      adminId,
    );
    await hostsRepository.createAuditLog({
      userId: adminId,
      action: HOST_CONSTANTS.AUDIT_ACTIONS.STATUS_CHANGE,
      entityId: hostId,
      changes: { accountStatus: 'SUSPENDED' },
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    await this.invalidateCache(host.slug, host.id);
    emitHostEvent('host.suspended', { hostId, userId: host.userId });

    return this.buildPrivateProfile(updated);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async requireHostByUserId(userId: string) {
    const host = await hostsRepository.findByUserId(userId);
    if (!host) throw new NotFoundError('Host profile not found.');
    return host;
  }

  private async requireActiveHostByUserId(userId: string) {
    const host = await this.requireHostByUserId(userId);
    if (['SUSPENDED', 'DELETED'].includes(host.accountStatus)) {
      throw new ForbiddenError('Host profile is not editable.');
    }
    if (host.accountStatus === 'INACTIVE') {
      throw new ForbiddenError('Reactivate your host profile to make changes.');
    }
    return host;
  }

  private async resolveDisplayName(userId: string): Promise<string | null> {
    const host = await hostsRepository.findByUserId(userId);
    const profile = host?.user?.profile;
    if (!profile) return null;
    const parts = [profile.firstName, profile.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : profile.username;
  }

  private async generateUniqueSlug(displayName: string, userId: string): Promise<string> {
    const base = displayName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'host';
    let slug = `${base}-${userId.slice(0, 8)}`;
    let attempt = 0;
    while (await hostsRepository.slugExists(slug)) {
      attempt += 1;
      slug = `${base}-${userId.slice(0, 8)}-${attempt}`;
    }
    return slug;
  }

  private calculateProfileCompletion(host: Awaited<ReturnType<typeof hostsRepository.findByUserId>>) {
    if (!host) return toProfileCompletionDto(0, [], [...HOST_CONSTANTS.PROFILE_COMPLETION_FIELDS]);

    const checks: Record<string, boolean> = {
      profileImage: Boolean(host.profileImage),
      bio: Boolean(host.bio && host.bio.length >= 10),
      address: host.addresses.length > 0,
      verification: host.verificationStatus === 'APPROVED' || host.accountStatus === 'VERIFIED',
      emergencyContact: Boolean(host.emergencyContactName && host.emergencyContactPhone),
      languages: host.languages.length > 0,
      socialLinks: Boolean(host.instagram || host.linkedin || host.twitter || host.website),
      coverImage: Boolean(host.coverImage),
      about: Boolean(host.about),
    };

    const completed = HOST_CONSTANTS.PROFILE_COMPLETION_FIELDS.filter((f) => checks[f]);
    const missing = HOST_CONSTANTS.PROFILE_COMPLETION_FIELDS.filter((f) => !checks[f]);
    const percentage = Math.round(
      (completed.length / HOST_CONSTANTS.PROFILE_COMPLETION_FIELDS.length) * 100,
    );
    return toProfileCompletionDto(percentage, completed, missing);
  }

  private buildPendingTasks(
    host: NonNullable<Awaited<ReturnType<typeof hostsRepository.findByUserId>>>,
    completion: ReturnType<typeof toProfileCompletionDto>,
  ): string[] {
    const tasks: string[] = [];
    if (host.accountStatus === 'PENDING') tasks.push('Awaiting host verification approval');
    if (host.verificationStatus !== 'APPROVED') tasks.push('Complete identity verification');
    if (completion.missing.includes('profileImage')) tasks.push('Upload profile avatar');
    if (completion.missing.includes('bio')) tasks.push('Add host bio');
    if (completion.missing.includes('address')) tasks.push('Add host address');
    if (completion.missing.includes('emergencyContact')) tasks.push('Add emergency contact');
    return tasks;
  }

  private async getStatisticsInternal(host: NonNullable<Awaited<ReturnType<typeof hostsRepository.findByUserId>>>) {
    return toStatisticsDto(host, host.analytics);
  }

  private async buildPublicProfile(host: HostWithRelations) {
    const gallery = host.media.filter((m) => m.mediaType === 'GALLERY');
    const galleryUrls = await Promise.all(
      gallery.map((m) =>
        s3StorageProvider.getSignedUrl(m.storageKey, HOST_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS),
      ),
    );
    const profileImageUrl = host.profileImage
      ? await s3StorageProvider.getSignedUrl(
          host.profileImage,
          HOST_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS,
        )
      : null;
    const coverImageUrl = host.coverImage
      ? await s3StorageProvider.getSignedUrl(
          host.coverImage,
          HOST_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS,
        )
      : null;
    const trustScore = host.user?.trustScore?.score ? Number(host.user.trustScore.score) : null;

    return toPublicProfileDto(host, { profileImageUrl, coverImageUrl, galleryUrls, trustScore });
  }

  private async buildPrivateProfile(host: NonNullable<Awaited<ReturnType<typeof hostsRepository.findByUserId>>>) {
    const publicPart = await this.buildPublicProfile(host);
    const completion = this.calculateProfileCompletion(host);
    const userKycStatus = await hostsRepository.getKycStatus(host.userId);
    return toPrivateProfileDto(host, {
      profileImageUrl: publicPart.profileImageUrl,
      coverImageUrl: publicPart.coverImageUrl,
      galleryUrls: publicPart.galleryUrls,
      trustScore: publicPart.trustScore,
      profileCompletion: completion.percentage,
      ...(userKycStatus !== null && { verificationStatus: userKycStatus }),
    });
  }

  private async uploadDocument(
    hostId: string,
    documentType: HostDocumentType,
    file: UploadedHostFile,
  ) {
    const fileName = `${hostId}-${documentType.toLowerCase()}-${randomUUID()}.${this.extensionFromMime(file.mimetype)}`;
    const result = await s3StorageProvider.uploadPrivateFile(
      HOST_CONSTANTS.S3_DOCUMENTS_FOLDER,
      fileName,
      file.buffer,
      file.mimetype,
    );
    return hostsRepository.addDocument(
      hostId,
      documentType,
      result.key,
      file.originalname,
      file.mimetype,
    );
  }

  private async recordMediaUpload(
    host: NonNullable<Awaited<ReturnType<typeof hostsRepository.findByUserId>>>,
    userId: string,
    mediaType: string,
    audit?: AuditMeta,
  ) {
    await hostsRepository.createActivity(host.id, HOST_CONSTANTS.ACTIVITY_TYPES.MEDIA_UPLOADED, {
      mediaType,
    });
    await hostsRepository.createAuditLog({
      userId,
      action: HOST_CONSTANTS.AUDIT_ACTIONS.MEDIA_UPLOAD,
      entityId: host.id,
      changes: { mediaType },
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
  }

  private validateImageFile(file: UploadedHostFile): void {
    if (file.size > HOST_CONSTANTS.MAX_UPLOAD_BYTES) {
      throw new ValidationError('File exceeds maximum size of 10MB.');
    }
    if (
      !HOST_CONSTANTS.ALLOWED_IMAGE_MIMES.includes(
        file.mimetype as (typeof HOST_CONSTANTS.ALLOWED_IMAGE_MIMES)[number],
      )
    ) {
      throw new ValidationError('Invalid image type. Allowed: jpg, jpeg, png, webp.');
    }
    validateImageDimensions(file.buffer, {
      minWidth: 200,
      minHeight: 200,
      maxWidth: 8000,
      maxHeight: 8000,
    });
  }

  private validateDocumentFile(file: UploadedHostFile): void {
    if (file.size > HOST_CONSTANTS.MAX_UPLOAD_BYTES) {
      throw new ValidationError('File exceeds maximum size of 10MB.');
    }
    if (
      !HOST_CONSTANTS.ALLOWED_DOC_MIMES.includes(
        file.mimetype as (typeof HOST_CONSTANTS.ALLOWED_DOC_MIMES)[number],
      )
    ) {
      throw new ValidationError('Invalid document type. Allowed: jpg, jpeg, png, webp, pdf.');
    }
    if (file.mimetype.startsWith('image/')) {
      validateImageDimensions(file.buffer, {
        minWidth: 200,
        minHeight: 200,
        maxWidth: 8000,
        maxHeight: 8000,
      });
    }
  }

  private extensionFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };
    return map[mime] ?? 'bin';
  }

  private async invalidateCache(slug: string, hostId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(
        HOST_CONSTANTS.REDIS_KEYS.publicProfile(slug),
        HOST_CONSTANTS.REDIS_KEYS.statistics(hostId),
      );
    } catch {
      // Redis optional in dev
    }
  }

  private async cachePublicProfile(slug: string, profile: unknown): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.setex(
        HOST_CONSTANTS.REDIS_KEYS.publicProfile(slug),
        HOST_CONSTANTS.CACHE_TTL_SECONDS,
        JSON.stringify(profile),
      );
    } catch {
      // ignore
    }
  }

  private async getCachedPublicProfile(slug: string) {
    try {
      const redis = getRedisClient();
      const raw = await redis.get(HOST_CONSTANTS.REDIS_KEYS.publicProfile(slug));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private async cacheStatistics(hostId: string, stats: unknown): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.setex(
        HOST_CONSTANTS.REDIS_KEYS.statistics(hostId),
        HOST_CONSTANTS.CACHE_TTL_SECONDS,
        JSON.stringify(stats),
      );
    } catch {
      // ignore
    }
  }

  private async getCachedStatistics(hostId: string) {
    try {
      const redis = getRedisClient();
      const raw = await redis.get(HOST_CONSTANTS.REDIS_KEYS.statistics(hostId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

export const hostsService = new HostsService();

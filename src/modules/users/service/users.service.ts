import { randomUUID } from 'node:crypto';
import { AccountStatus } from '@prisma/client';
import {
  ConflictError,
  FollowNotAllowedError,
  ForbiddenError,
  NotFoundError,
  TrustScoreUnavailableError,
  UnauthorizedActionError,
  ValidationError,
} from '@errors/index.js';
import { getRedisClient } from '@redis/index.js';
import { s3StorageProvider } from '../../../providers/storage/s3.provider.js';
import { buildPaginationMeta, parsePagination } from '../../../utils/pagination.util.js';
import { sanitizeString } from '../../../utils/sanitize.util.js';
import { usersRepository } from '../repository/users.repository.js';
import {
  toAccountSettingsDto,
  toActivityItemDto,
  toAdminUserDto,
  toConnectedAccountDto,
  toDeviceSessionDto,
  toFollowUserDto,
  toFullUserProfile,
  toPrivacySettingsDto,
  toPublicProfileView,
  toSavedEventDto,
  toTrustFactorsDto,
  toTrustScoreDto,
} from '../dto/users.dto.js';
import { USERS_CONSTANTS } from '../constants/users.constants.js';
import type {
  AdminUpdateUserInput,
  AdminUserListQuery,
  UpdateAccountSettingsInput,
  UpdateInterestsInput,
  UpdateNotificationSettingsInput,
  UpdatePrivacySettingsInput,
  UpdateProfileInput,
  PaginationQuery,
} from '../schemas/users.schema.js';
import type { Prisma } from '@prisma/client';
import type {
  ActivityItemView,
  FollowUserView,
  TrustFactorView,
} from '../types/users.types.js';

interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(
      (entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] !== undefined,
    ),
  ) as Partial<T>;
}

function toPaginationInput(query: PaginationQuery) {
  const input: { page?: number; limit?: number } = {};
  if (query.page !== undefined) input.page = query.page;
  if (query.limit !== undefined) input.limit = query.limit;
  return input;
}

export class UsersService {
  async getMyProfile(userId: string) {
    const user = await usersRepository.findFullProfileById(userId);
    if (!user) throw new NotFoundError('User not found.');
    return toFullUserProfile(user);
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const profileData: Record<string, unknown> = {};
    if (input.firstName !== undefined) profileData.firstName = sanitizeString(input.firstName);
    if (input.lastName !== undefined) profileData.lastName = sanitizeString(input.lastName);
    if (input.bio !== undefined) profileData.bio = sanitizeString(input.bio);
    if (input.gender !== undefined) profileData.gender = input.gender;
    if (input.dob !== undefined) profileData.dob = new Date(input.dob);
    if (input.occupation !== undefined) profileData.occupation = sanitizeString(input.occupation);
    if (input.company !== undefined) profileData.company = sanitizeString(input.company);
    if (input.city !== undefined) profileData.city = sanitizeString(input.city);
    if (input.state !== undefined) profileData.state = sanitizeString(input.state);
    if (input.country !== undefined) profileData.country = sanitizeString(input.country);

    const socialKeys = ['instagram', 'linkedin', 'twitter', 'github', 'website'] as const;
    const socialData: Record<string, string | null> = {};
    let hasSocial = false;
    for (const key of socialKeys) {
      if (input[key] !== undefined) {
        hasSocial = true;
        socialData[key] = input[key] === '' ? null : input[key]!;
      }
    }

    const user = await usersRepository.updateProfile(
      userId,
      profileData,
      hasSocial ? socialData : undefined,
    );

    await this.logActivity(userId, USERS_CONSTANTS.ACTIVITY_TYPES.PROFILE_UPDATED, 'user', userId);
    await this.invalidateProfileCache(userId, user.profile?.username);

    return toFullUserProfile(user);
  }

  async uploadAvatar(userId: string, file: UploadedImageFile) {
    this.validateImageFile(file);
    const fileName = `${userId}-${randomUUID()}.${this.extensionFromMime(file.mimetype)}`;
    const result = await s3StorageProvider.uploadFile(
      USERS_CONSTANTS.AVATAR_FOLDER,
      fileName,
      file.buffer,
      file.mimetype,
    );

    await usersRepository.updateProfileImage(userId, result.url);
    await usersRepository.createFileUpload({
      userId,
      fileName: file.originalname,
      url: result.url,
      mime: file.mimetype,
      size: file.size,
    });

    const user = await usersRepository.findFullProfileById(userId);
    await this.logActivity(userId, USERS_CONSTANTS.ACTIVITY_TYPES.AVATAR_UPDATED, 'user', userId);
    await this.invalidateProfileCache(userId, user?.profile?.username);

    return { url: result.url };
  }

  async uploadCoverImage(userId: string, file: UploadedImageFile) {
    this.validateImageFile(file);
    const fileName = `${userId}-${randomUUID()}.${this.extensionFromMime(file.mimetype)}`;
    const result = await s3StorageProvider.uploadFile(
      USERS_CONSTANTS.COVER_FOLDER,
      fileName,
      file.buffer,
      file.mimetype,
    );

    await usersRepository.updateCoverImage(userId, result.url);
    await usersRepository.createFileUpload({
      userId,
      fileName: file.originalname,
      url: result.url,
      mime: file.mimetype,
      size: file.size,
    });

    const user = await usersRepository.findFullProfileById(userId);
    await this.logActivity(userId, USERS_CONSTANTS.ACTIVITY_TYPES.COVER_UPDATED, 'user', userId);
    await this.invalidateProfileCache(userId, user?.profile?.username);

    return { url: result.url };
  }

  async getPublicProfile(username: string, viewerId?: string) {
    const cached = await this.getCachedPublicProfile(username);
    if (cached && !viewerId) return cached;

    const user = await usersRepository.findByUsername(username);
    if (!user?.profile) throw new NotFoundError('User not found.');

    const privacy = await usersRepository.getOrCreatePrivacySettings(user.id);
    if (privacy.profileVisibility === 'PRIVATE' && user.id !== viewerId) {
      throw new ForbiddenError('This profile is private.');
    }

    if (privacy.profileVisibility === 'FOLLOWERS' && user.id !== viewerId) {
      if (!viewerId || !(await usersRepository.isFollowing(viewerId, user.id))) {
        throw new ForbiddenError('This profile is only visible to followers.');
      }
    }

    const isFollowing =
      viewerId && viewerId !== user.id
        ? await usersRepository.isFollowing(viewerId, user.id)
        : undefined;

    const profile = toPublicProfileView(user, {
      ...(isFollowing !== undefined && { isFollowing }),
      hideTrustScore: !privacy.showTrustScore,
    });

    if (!viewerId) {
      await this.cachePublicProfile(username, profile);
    }

    return profile;
  }

  async getInterests(userId: string) {
    const interests = await usersRepository.getInterests(userId);
    return { interests };
  }

  async updateInterests(userId: string, input: UpdateInterestsInput) {
    const interests = input.interests.map((i) => sanitizeString(i));
    await usersRepository.replaceInterests(userId, interests);
    await this.logActivity(
      userId,
      USERS_CONSTANTS.ACTIVITY_TYPES.INTERESTS_UPDATED,
      'user',
      userId,
      { interests },
    );
    return { interests };
  }

  async getPrivacySettings(userId: string) {
    const settings = await usersRepository.getOrCreatePrivacySettings(userId);
    return toPrivacySettingsDto({
      profileVisibility: settings.profileVisibility,
      activityVisibility: settings.activityVisibility,
      showEmail: settings.showEmail,
      showPhone: settings.showPhone,
      showLastSeen: settings.showLastSeen,
      allowFollowRequests: settings.allowFollowRequests,
      showTrustScore: settings.showTrustScore,
      showActivityFeed: settings.showActivityFeed,
    });
  }

  async updatePrivacySettings(userId: string, input: UpdatePrivacySettingsInput) {
    const settings = await usersRepository.updatePrivacySettings(
      userId,
      omitUndefined(input) as Prisma.UserPrivacySettingUpdateInput,
    );
    await this.logActivity(
      userId,
      USERS_CONSTANTS.ACTIVITY_TYPES.SETTINGS_UPDATED,
      'privacy_settings',
      settings.id,
    );
    return toPrivacySettingsDto({
      profileVisibility: settings.profileVisibility,
      activityVisibility: settings.activityVisibility,
      showEmail: settings.showEmail,
      showPhone: settings.showPhone,
      showLastSeen: settings.showLastSeen,
      allowFollowRequests: settings.allowFollowRequests,
      showTrustScore: settings.showTrustScore,
      showActivityFeed: settings.showActivityFeed,
    });
  }

  async getAccountSettings(userId: string) {
    const settings = await usersRepository.getOrCreateAccountSettings(userId);
    return toAccountSettingsDto({
      language: settings.language,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      currency: settings.currency,
      twoFactorEnabled: settings.twoFactorEnabled,
      marketingOptIn: settings.marketingOptIn,
    });
  }

  async updateAccountSettings(userId: string, input: UpdateAccountSettingsInput) {
    const settings = await usersRepository.updateAccountSettings(
      userId,
      omitUndefined(input) as Prisma.UserAccountSettingUpdateInput,
    );
    await this.logActivity(
      userId,
      USERS_CONSTANTS.ACTIVITY_TYPES.SETTINGS_UPDATED,
      'account_settings',
      settings.id,
    );
    return toAccountSettingsDto({
      language: settings.language,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      currency: settings.currency,
      twoFactorEnabled: settings.twoFactorEnabled,
      marketingOptIn: settings.marketingOptIn,
    });
  }

  async getNotificationSettings(userId: string) {
    const { notificationsService } = await import('../../notifications/service/notifications.service.js');
    return notificationsService.getPreferences(userId);
  }

  async updateNotificationSettings(userId: string, input: UpdateNotificationSettingsInput) {
    const { notificationsService } = await import('../../notifications/service/notifications.service.js');
    return notificationsService.updatePreferences(userId, input);
  }

  async getUserSettings(userId: string) {
    const [privacy, account, notifications] = await Promise.all([
      this.getPrivacySettings(userId),
      this.getAccountSettings(userId),
      this.getNotificationSettings(userId),
    ]);
    return { privacy, account, notifications };
  }

  async listDevices(userId: string) {
    const devices = await usersRepository.listDevices(userId);
    return devices.map((d) =>
      toDeviceSessionDto({
        id: d.id,
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        platform: d.platform,
        isTrusted: d.isTrusted,
        lastLogin: d.lastLogin,
        createdAt: d.createdAt,
      }),
    );
  }

  async removeDevice(userId: string, deviceId: string) {
    const removed = await usersRepository.deleteDevice(userId, deviceId);
    if (!removed) throw new NotFoundError('Device not found.');
    await usersRepository.revokeSessionByDevice(userId, deviceId);
    return { message: 'Device removed successfully.' };
  }

  async listConnectedAccounts(userId: string) {
    const accounts = await usersRepository.listConnectedAccounts(userId);
    const user = await usersRepository.findById(userId);

    const views = accounts.map((a) =>
      toConnectedAccountDto({
        id: a.id,
        provider: a.provider,
        email: a.email,
        connectedAt: a.connectedAt,
      }),
    );

    if (user && !views.some((v) => v.provider === user.provider)) {
      views.unshift(
        toConnectedAccountDto({
          id: user.id,
          provider: user.provider,
          email: user.email,
          connectedAt: user.createdAt,
        }),
      );
    }

    return views;
  }

  async disconnectConnectedAccount(userId: string, provider: string) {
    if (provider === 'EMAIL' || provider === 'PHONE') {
      throw new UnauthorizedActionError('Primary account provider cannot be disconnected.');
    }
    const removed = await usersRepository.disconnectAccount(
      userId,
      provider as 'GOOGLE' | 'APPLE',
    );
    if (!removed) throw new NotFoundError('Connected account not found.');
    return { message: 'Account disconnected successfully.' };
  }

  async getTrustScore(userId: string) {
    const score = await usersRepository.getTrustScore(userId);
    if (!score) {
      throw new TrustScoreUnavailableError();
    }
    return toTrustScoreDto({
      score: score.score,
      level: score.level,
      verifiedIdentity: score.verifiedIdentity,
      completedEvents: score.completedEvents,
      positiveReviews: score.positiveReviews,
      negativeReports: score.negativeReports,
      lastUpdated: score.lastUpdated,
    });
  }

  async getTrustScoreHistory(userId: string, query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(toPaginationInput(query), {
      page: USERS_CONSTANTS.DEFAULT_PAGE,
      limit: USERS_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: USERS_CONSTANTS.MAX_LIMIT,
    });
    const [items, total] = await Promise.all([
      usersRepository.getTrustScoreHistory(userId, skip, limit),
      usersRepository.countTrustScoreHistory(userId),
    ]);
    return {
      history: items,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getTrustFactors(userId: string) {
    const [score, user] = await Promise.all([
      usersRepository.getTrustScore(userId),
      usersRepository.findFullProfileById(userId),
    ]);
    if (!score || !user?.profile) {
      throw new TrustScoreUnavailableError();
    }

    const profile = user.profile;
    const completionFields = [
      profile.bio,
      profile.profileImage,
      profile.city,
      profile.occupation,
      user.interests.length > 0,
    ];
    const completed = completionFields.filter(Boolean).length;
    const profileCompletion = Math.round((completed / completionFields.length) * 100);

    const factors: TrustFactorView[] = [
      { name: 'Verified Identity', value: score.verifiedIdentity, impact: 'positive' },
      { name: 'Completed Events', value: score.completedEvents, impact: 'positive' },
      { name: 'Positive Reviews', value: score.positiveReviews, impact: 'positive' },
      { name: 'Negative Reports', value: score.negativeReports, impact: 'negative' },
      { name: 'Profile Completion', value: `${profileCompletion}%`, impact: 'neutral' },
    ];

    return toTrustFactorsDto(factors);
  }

  async getMyActivity(userId: string, query: PaginationQuery) {
    const privacy = await usersRepository.getOrCreatePrivacySettings(userId);
    if (!privacy.showActivityFeed) {
      throw new ForbiddenError('Activity feed is disabled in privacy settings.');
    }
    return this.listActivity(userId, query);
  }

  async getPublicActivity(username: string, viewerId?: string) {
    const user = await usersRepository.findByUsername(username);
    if (!user) throw new NotFoundError('User not found.');

    const privacy = await usersRepository.getOrCreatePrivacySettings(user.id);
    if (!privacy.showActivityFeed) {
      throw new ForbiddenError('Activity feed is not available.');
    }

    if (privacy.activityVisibility === 'PRIVATE' && user.id !== viewerId) {
      throw new ForbiddenError('Activity feed is private.');
    }

    if (privacy.activityVisibility === 'FOLLOWERS' && user.id !== viewerId) {
      if (!viewerId || !(await usersRepository.isFollowing(viewerId, user.id))) {
        throw new ForbiddenError('Activity feed is only visible to followers.');
      }
    }

    return this.listActivity(user.id, { page: 1, limit: USERS_CONSTANTS.DEFAULT_LIMIT });
  }

  async listActivity(userId: string, query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(toPaginationInput(query), {
      page: USERS_CONSTANTS.DEFAULT_PAGE,
      limit: USERS_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: USERS_CONSTANTS.MAX_LIMIT,
    });
    const [rows, total] = await Promise.all([
      usersRepository.listActivityLogs(userId, skip, limit),
      usersRepository.countActivityLogs(userId),
    ]);

    const activities: ActivityItemView[] = rows.map((row) =>
      toActivityItemDto({
        id: row.id,
        activityType: row.activityType,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: (row.metadataJson as Record<string, unknown> | null) ?? null,
        createdAt: row.createdAt,
      }),
    );

    return { activities, meta: buildPaginationMeta(page, limit, total) };
  }

  async listSavedEvents(userId: string, query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(toPaginationInput(query), {
      page: USERS_CONSTANTS.DEFAULT_PAGE,
      limit: USERS_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: USERS_CONSTANTS.MAX_LIMIT,
    });
    const [rows, total] = await Promise.all([
      usersRepository.listSavedEvents(userId, skip, limit),
      usersRepository.countSavedEvents(userId),
    ]);

    const events = rows
      .filter((r) => r.event && !r.event.deletedAt)
      .map((r) =>
        toSavedEventDto({
          id: r.id,
          eventId: r.event.id,
          title: r.event.title,
          slug: r.event.slug,
          eventStart: r.event.eventStart,
          savedAt: r.createdAt,
        }),
      );

    return { events, meta: buildPaginationMeta(page, limit, total) };
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new FollowNotAllowedError('You cannot follow yourself.');
    }

    const target = await usersRepository.findById(followingId);
    if (!target) throw new NotFoundError('User not found.');
    if (target.accountStatus !== AccountStatus.ACTIVE) {
      throw new FollowNotAllowedError('Cannot follow this user.');
    }

    const privacy = await usersRepository.getOrCreatePrivacySettings(followingId);
    if (!privacy.allowFollowRequests) {
      throw new FollowNotAllowedError('This user does not accept followers.');
    }

    const already = await usersRepository.isFollowing(followerId, followingId);
    if (already) throw new ConflictError('Already following this user.');

    await usersRepository.createFollow(followerId, followingId);
    await this.logActivity(
      followerId,
      USERS_CONSTANTS.ACTIVITY_TYPES.USER_FOLLOWED,
      'user',
      followingId,
    );
    await this.invalidateProfileCache(undefined, target.profile?.username);

    return { message: 'User followed successfully.' };
  }

  async unfollowUser(followerId: string, followingId: string) {
    const removed = await usersRepository.deleteFollow(followerId, followingId);
    if (!removed) throw new NotFoundError('Follow relationship not found.');

    const target = await usersRepository.findById(followingId);
    await this.logActivity(
      followerId,
      USERS_CONSTANTS.ACTIVITY_TYPES.USER_UNFOLLOWED,
      'user',
      followingId,
    );
    await this.invalidateProfileCache(undefined, target?.profile?.username);

    return { message: 'User unfollowed successfully.' };
  }

  async listFollowers(userId: string, query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(toPaginationInput(query), {
      page: USERS_CONSTANTS.DEFAULT_PAGE,
      limit: USERS_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: USERS_CONSTANTS.MAX_LIMIT,
    });
    const [rows, total] = await Promise.all([
      usersRepository.listFollowers(userId, skip, limit),
      usersRepository.countFollowers(userId),
    ]);

    const followers: FollowUserView[] = rows
      .filter((r) => r.follower.profile)
      .map((r) =>
        toFollowUserDto({
          id: r.follower.id,
          username: r.follower.profile!.username,
          firstName: r.follower.profile!.firstName,
          lastName: r.follower.profile!.lastName,
          profileImage: r.follower.profile!.profileImage,
          followedAt: r.createdAt,
        }),
      );

    return { followers, meta: buildPaginationMeta(page, limit, total) };
  }

  async listFollowing(userId: string, query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(toPaginationInput(query), {
      page: USERS_CONSTANTS.DEFAULT_PAGE,
      limit: USERS_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: USERS_CONSTANTS.MAX_LIMIT,
    });
    const [rows, total] = await Promise.all([
      usersRepository.listFollowing(userId, skip, limit),
      usersRepository.countFollowing(userId),
    ]);

    const following: FollowUserView[] = rows
      .filter((r) => r.following.profile)
      .map((r) =>
        toFollowUserDto({
          id: r.following.id,
          username: r.following.profile!.username,
          firstName: r.following.profile!.firstName,
          lastName: r.following.profile!.lastName,
          profileImage: r.following.profile!.profileImage,
          followedAt: r.createdAt,
        }),
      );

    return { following, meta: buildPaginationMeta(page, limit, total) };
  }

  private validateImageFile(file: UploadedImageFile): void {
    if (!file) throw new ValidationError('No file uploaded.');
    if (!USERS_CONSTANTS.ALLOWED_IMAGE_MIMES.includes(file.mimetype as (typeof USERS_CONSTANTS.ALLOWED_IMAGE_MIMES)[number])) {
      throw new ValidationError('Invalid file type. Allowed: jpg, jpeg, png, webp.');
    }
    if (file.size > USERS_CONSTANTS.MAX_UPLOAD_BYTES) {
      throw new ValidationError('File size exceeds 10 MB limit.');
    }
  }

  private extensionFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    return map[mime] ?? 'jpg';
  }

  private async logActivity(
    userId: string,
    activityType: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await usersRepository.createActivityLog({
      userId,
      activityType,
      entityType,
      entityId,
      ...(metadata !== undefined && { metadata }),
    });
  }

  private async invalidateProfileCache(userId?: string, username?: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const keys: string[] = [];
      if (userId) keys.push(USERS_CONSTANTS.REDIS_KEYS.profileCache(userId));
      if (username) keys.push(USERS_CONSTANTS.REDIS_KEYS.publicProfileCache(username));
      if (keys.length > 0) await redis.del(...keys);
    } catch {
      // Redis optional in some environments
    }
  }

  private async cachePublicProfile(
    username: string,
    profile: ReturnType<typeof toPublicProfileView>,
  ): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.setex(
        USERS_CONSTANTS.REDIS_KEYS.publicProfileCache(username),
        USERS_CONSTANTS.CACHE_TTL_SECONDS,
        JSON.stringify(profile),
      );
    } catch {
      // ignore
    }
  }

  private async getCachedPublicProfile(username: string) {
    try {
      const redis = getRedisClient();
      const raw = await redis.get(USERS_CONSTANTS.REDIS_KEYS.publicProfileCache(username));
      if (!raw) return null;
      return JSON.parse(raw) as ReturnType<typeof toPublicProfileView>;
    } catch {
      return null;
    }
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async listAdminUsers(query: AdminUserListQuery) {
    const { page, limit, skip } = parsePagination(toPaginationInput(query), {
      page: USERS_CONSTANTS.DEFAULT_PAGE,
      limit: USERS_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: USERS_CONSTANTS.MAX_LIMIT,
    });

    const { items, total } = await usersRepository.listAdminUsers({
      skip,
      take: limit,
      ...(query.search !== undefined && { search: query.search }),
      ...(query.status !== undefined && { status: query.status }),
      ...(query.city !== undefined && { city: query.city }),
      ...(query.verified !== undefined && { verified: query.verified }),
      ...(query.role !== undefined && { role: query.role }),
    });

    return {
      items: items.map((u) => toAdminUserDto(u)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getAdminUser(userId: string) {
    const user = await usersRepository.findAdminUserById(userId);
    if (!user) throw new NotFoundError('User not found.');
    return toAdminUserDto(user);
  }

  async updateAdminUser(
    userId: string,
    adminId: string,
    input: AdminUpdateUserInput,
    audit?: { ip?: string; browser?: string },
  ) {
    const existing = await usersRepository.findAdminUserById(userId);
    if (!existing) throw new NotFoundError('User not found.');

    const payload: {
      firstName?: string;
      lastName?: string;
      city?: string;
      accountStatus?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    } = {};
    if (input.firstName !== undefined) payload.firstName = input.firstName;
    if (input.lastName !== undefined) payload.lastName = input.lastName;
    if (input.city !== undefined) payload.city = input.city;
    if (input.accountStatus !== undefined) payload.accountStatus = input.accountStatus;

    const updated = await usersRepository.adminUpdateUser(userId, adminId, payload);
    await usersRepository.createAdminAuditLog({
      adminId,
      action: 'ADMIN_UPDATE_USER',
      entityId: userId,
      changes: payload,
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    await this.invalidateProfileCache(userId, existing.profile?.username);
    return toAdminUserDto(updated);
  }

  async suspendUser(userId: string, adminId: string, audit?: { ip?: string; browser?: string }) {
    const existing = await usersRepository.findAdminUserById(userId);
    if (!existing) throw new NotFoundError('User not found.');
    if (existing.id === adminId) {
      throw new ValidationError('You cannot suspend your own account.');
    }

    const updated = await usersRepository.updateAccountStatus(userId, 'SUSPENDED', adminId);
    await usersRepository.createAdminAuditLog({
      adminId,
      action: 'ADMIN_SUSPEND_USER',
      entityId: userId,
      changes: { accountStatus: 'SUSPENDED' },
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    await this.invalidateProfileCache(userId, existing.profile?.username);
    return toAdminUserDto(updated);
  }

  async banUser(userId: string, adminId: string, audit?: { ip?: string; browser?: string }) {
    const existing = await usersRepository.findAdminUserById(userId);
    if (!existing) throw new NotFoundError('User not found.');
    if (existing.id === adminId) {
      throw new ValidationError('You cannot ban your own account.');
    }

    // Ban = soft-delete (permanent removal from platform until restore)
    const updated = await usersRepository.updateAccountStatus(userId, 'DELETED', adminId, {
      softDelete: true,
    });
    await usersRepository.createAdminAuditLog({
      adminId,
      action: 'ADMIN_BAN_USER',
      entityId: userId,
      changes: { accountStatus: 'DELETED', banned: true },
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    await this.invalidateProfileCache(userId, existing.profile?.username);
    return toAdminUserDto(updated);
  }

  async restoreUser(userId: string, adminId: string, audit?: { ip?: string; browser?: string }) {
    const existing = await usersRepository.findAdminUserById(userId);
    if (!existing) throw new NotFoundError('User not found.');

    const updated = await usersRepository.updateAccountStatus(userId, 'ACTIVE', adminId, {
      softDelete: false,
    });
    await usersRepository.createAdminAuditLog({
      adminId,
      action: 'ADMIN_RESTORE_USER',
      entityId: userId,
      changes: { accountStatus: 'ACTIVE' },
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    await this.invalidateProfileCache(userId, existing.profile?.username);
    return toAdminUserDto(updated);
  }

  async softDeleteUser(userId: string, adminId: string, audit?: { ip?: string; browser?: string }) {
    const existing = await usersRepository.findAdminUserById(userId);
    if (!existing) throw new NotFoundError('User not found.');
    if (existing.id === adminId) {
      throw new ValidationError('You cannot delete your own account.');
    }

    const updated = await usersRepository.updateAccountStatus(userId, 'DELETED', adminId, {
      softDelete: true,
    });
    await usersRepository.createAdminAuditLog({
      adminId,
      action: 'ADMIN_DELETE_USER',
      entityId: userId,
      changes: { accountStatus: 'DELETED', isDeleted: true },
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
    await this.invalidateProfileCache(userId, existing.profile?.username);
    return toAdminUserDto(updated);
  }
}

export const usersService = new UsersService();

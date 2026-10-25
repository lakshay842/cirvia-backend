import { prisma } from '@database/index.js';
import type { AuthProvider, Prisma } from '@prisma/client';
import { hashToken } from '../../../providers/redis/auth.redis.js';

const userProfileInclude = {
  profile: true,
  interests: true,
  socialLinks: true,
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

export type UserWithFullProfile = Prisma.UserGetPayload<{ include: typeof userProfileInclude }>;

export class UsersRepository {
  async findFullProfileById(userId: string): Promise<UserWithFullProfile | null> {
    return prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isDeleted: false },
      include: userProfileInclude,
    });
  }

  async findByUsername(username: string): Promise<UserWithFullProfile | null> {
    return prisma.user.findFirst({
      where: {
        profile: { username },
        deletedAt: null,
        isDeleted: false,
      },
      include: userProfileInclude,
    });
  }

  async findById(userId: string): Promise<UserWithFullProfile | null> {
    return this.findFullProfileById(userId);
  }

  async updateProfile(
    userId: string,
    data: Prisma.UserProfileUpdateInput,
    socialLinks?: Prisma.SocialLinkUpdateInput,
  ): Promise<UserWithFullProfile> {
    return prisma.$transaction(async (tx) => {
      await tx.userProfile.update({
        where: { userId },
        data: { ...data, updatedBy: userId },
      });

      if (socialLinks) {
        await tx.socialLink.upsert({
          where: { userId },
          create: {
            userId,
            instagram: (socialLinks.instagram as string | undefined) ?? null,
            linkedin: (socialLinks.linkedin as string | undefined) ?? null,
            twitter: (socialLinks.twitter as string | undefined) ?? null,
            github: (socialLinks.github as string | undefined) ?? null,
            website: (socialLinks.website as string | undefined) ?? null,
          },
          update: socialLinks,
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: userProfileInclude,
      });
    });
  }

  async updateProfileImage(userId: string, url: string): Promise<void> {
    await prisma.userProfile.update({
      where: { userId },
      data: { profileImage: url, updatedBy: userId },
    });
  }

  async updateCoverImage(userId: string, url: string): Promise<void> {
    await prisma.userProfile.update({
      where: { userId },
      data: { coverImage: url, updatedBy: userId },
    });
  }

  async replaceInterests(userId: string, interests: string[]): Promise<string[]> {
    await prisma.$transaction(async (tx) => {
      await tx.userInterest.deleteMany({ where: { userId } });
      if (interests.length > 0) {
        await tx.userInterest.createMany({
          data: interests.map((interest) => ({ userId, interest })),
        });
      }
    });
    return interests;
  }

  async getInterests(userId: string): Promise<string[]> {
    const rows = await prisma.userInterest.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => r.interest);
  }

  async getOrCreatePrivacySettings(userId: string) {
    return prisma.userPrivacySetting.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updatePrivacySettings(
    userId: string,
    data: Prisma.UserPrivacySettingUpdateInput,
  ) {
    const existing = await prisma.userPrivacySetting.findUnique({ where: { userId } });
    if (existing) {
      return prisma.userPrivacySetting.update({ where: { userId }, data });
    }
    return prisma.userPrivacySetting.create({
      data: { ...(data as Prisma.UserPrivacySettingUncheckedCreateInput), userId },
    });
  }

  async getOrCreateAccountSettings(userId: string) {
    return prisma.userAccountSetting.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updateAccountSettings(
    userId: string,
    data: Prisma.UserAccountSettingUpdateInput,
  ) {
    const existing = await prisma.userAccountSetting.findUnique({ where: { userId } });
    if (existing) {
      return prisma.userAccountSetting.update({ where: { userId }, data });
    }
    return prisma.userAccountSetting.create({
      data: { ...(data as Prisma.UserAccountSettingUncheckedCreateInput), userId },
    });
  }

  async getOrCreateNotificationPreferences(userId: string) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updateNotificationPreferences(
    userId: string,
    data: Prisma.NotificationPreferenceUpdateInput,
  ) {
    const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (existing) {
      return prisma.notificationPreference.update({ where: { userId }, data });
    }
    return prisma.notificationPreference.create({
      data: { ...(data as Prisma.NotificationPreferenceUncheckedCreateInput), userId },
    });
  }

  async listDevices(userId: string) {
    return prisma.userDevice.findMany({
      where: { userId },
      orderBy: { lastLogin: 'desc' },
    });
  }

  async deleteDevice(userId: string, deviceId: string): Promise<boolean> {
    const result = await prisma.userDevice.deleteMany({
      where: { userId, deviceId },
    });
    return result.count > 0;
  }

  async listConnectedAccounts(userId: string) {
    return prisma.connectedAccount.findMany({
      where: { userId, disconnectedAt: null },
      orderBy: { connectedAt: 'desc' },
    });
  }

  async disconnectAccount(userId: string, provider: AuthProvider): Promise<boolean> {
    const result = await prisma.connectedAccount.updateMany({
      where: { userId, provider, disconnectedAt: null },
      data: { disconnectedAt: new Date() },
    });
    return result.count > 0;
  }

  async getTrustScore(userId: string) {
    return prisma.trustScore.findUnique({ where: { userId } });
  }

  async getTrustScoreHistory(userId: string, skip: number, take: number) {
    return prisma.trustScoreHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async countTrustScoreHistory(userId: string): Promise<number> {
    return prisma.trustScoreHistory.count({ where: { userId } });
  }

  async createActivityLog(data: {
    userId: string;
    activityType: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.activityLog.create({
      data: {
        userId: data.userId,
        activityType: data.activityType,
        entityType: data.entityType,
        entityId: data.entityId,
        ...(data.metadata !== undefined && { metadataJson: data.metadata as Prisma.InputJsonValue }),
      },
    });
  }

  async listActivityLogs(userId: string, skip: number, take: number) {
    return prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async countActivityLogs(userId: string): Promise<number> {
    return prisma.activityLog.count({ where: { userId } });
  }

  async listSavedEvents(userId: string, skip: number, take: number) {
    return prisma.eventFavorite.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            eventStart: true,
            deletedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async countSavedEvents(userId: string): Promise<number> {
    return prisma.eventFavorite.count({ where: { userId } });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const count = await prisma.userFollow.count({
      where: { followerId, followingId },
    });
    return count > 0;
  }

  async createFollow(followerId: string, followingId: string) {
    return prisma.$transaction(async (tx) => {
      const follow = await tx.userFollow.create({
        data: { followerId, followingId },
      });
      await tx.userProfile.update({
        where: { userId: followerId },
        data: { followingCount: { increment: 1 } },
      });
      await tx.userProfile.update({
        where: { userId: followingId },
        data: { followersCount: { increment: 1 } },
      });
      return follow;
    });
  }

  async deleteFollow(followerId: string, followingId: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const result = await tx.userFollow.deleteMany({
        where: { followerId, followingId },
      });
      if (result.count === 0) return false;
      await tx.userProfile.update({
        where: { userId: followerId },
        data: { followingCount: { decrement: 1 } },
      });
      await tx.userProfile.update({
        where: { userId: followingId },
        data: { followersCount: { decrement: 1 } },
      });
      return true;
    });
  }

  async listFollowers(userId: string, skip: number, take: number) {
    const rows = await prisma.userFollow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    return rows;
  }

  async listFollowing(userId: string, skip: number, take: number) {
    const rows = await prisma.userFollow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    return rows;
  }

  async countFollowers(userId: string): Promise<number> {
    return prisma.userFollow.count({ where: { followingId: userId } });
  }

  async countFollowing(userId: string): Promise<number> {
    return prisma.userFollow.count({ where: { followerId: userId } });
  }

  async createFileUpload(data: {
    userId: string;
    fileName: string;
    url: string;
    mime: string;
    size: number;
  }) {
    return prisma.fileUpload.create({
      data: {
        userId: data.userId,
        fileName: data.fileName,
        url: data.url,
        mime: data.mime,
        size: data.size,
        type: 'IMAGE',
      },
    });
  }

  async revokeUserSessionsExcept(userId: string, exceptSessionId?: string) {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        deletedAt: null,
        expiresAt: { gt: new Date() },
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
    });
    if (sessions.length === 0) return;
    await prisma.userSession.updateMany({
      where: { id: { in: sessions.map((s) => s.id) } },
      data: { deletedAt: new Date() },
    });
  }

  async revokeSessionByDevice(userId: string, deviceId: string): Promise<void> {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        deviceName: deviceId,
        deletedAt: null,
      },
    });
    if (sessions.length > 0) {
      await prisma.userSession.updateMany({
        where: { id: { in: sessions.map((s) => s.id) } },
        data: { deletedAt: new Date() },
      });
    }
  }

  hashRefreshToken(token: string): string {
    return hashToken(token);
  }

  async listAdminUsers(params: {
    skip: number;
    take: number;
    search?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
    city?: string;
    verified?: boolean;
    role?: string;
  }) {
    const where: Prisma.UserWhereInput = {
      ...(params.status === 'DELETED'
        ? { OR: [{ accountStatus: 'DELETED' }, { isDeleted: true }] }
        : params.status
          ? { accountStatus: params.status, isDeleted: false, deletedAt: null }
          : { isDeleted: false, deletedAt: null }),
      ...(params.verified !== undefined && { emailVerified: params.verified }),
      ...(params.city && {
        profile: { is: { city: { contains: params.city, mode: 'insensitive' } } },
      }),
      ...(params.role && {
        userRoles: { some: { role: { name: params.role } } },
      }),
      ...(params.search && {
        OR: [
          { email: { contains: params.search, mode: 'insensitive' } },
          { phone: { contains: params.search, mode: 'insensitive' } },
          { profile: { is: { firstName: { contains: params.search, mode: 'insensitive' } } } },
          { profile: { is: { lastName: { contains: params.search, mode: 'insensitive' } } } },
          { profile: { is: { username: { contains: params.search, mode: 'insensitive' } } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          userRoles: { include: { role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  async findAdminUserById(userId: string) {
    return prisma.user.findFirst({
      where: { id: userId },
      include: {
        profile: true,
        userRoles: { include: { role: true } },
      },
    });
  }

  async updateAccountStatus(
    userId: string,
    accountStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED',
    adminId: string,
    options?: { softDelete?: boolean },
  ) {
    const softDelete = options?.softDelete ?? accountStatus === 'DELETED';
    return prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus,
        updatedBy: adminId,
        ...(softDelete
          ? { isDeleted: true, deletedAt: new Date() }
          : { isDeleted: false, deletedAt: null }),
      },
      include: {
        profile: true,
        userRoles: { include: { role: true } },
      },
    });
  }

  async adminUpdateUser(
    userId: string,
    adminId: string,
    data: {
      firstName?: string;
      lastName?: string;
      city?: string;
      accountStatus?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    },
  ) {
    return prisma.$transaction(async (tx) => {
      if (data.accountStatus) {
        await tx.user.update({
          where: { id: userId },
          data: {
            accountStatus: data.accountStatus,
            updatedBy: adminId,
            isDeleted: false,
            deletedAt: null,
          },
        });
      }

      if (data.firstName || data.lastName || data.city) {
        await tx.userProfile.update({
          where: { userId },
          data: {
            ...(data.firstName !== undefined && { firstName: data.firstName }),
            ...(data.lastName !== undefined && { lastName: data.lastName }),
            ...(data.city !== undefined && { city: data.city }),
            updatedBy: adminId,
          },
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          profile: true,
          userRoles: { include: { role: true } },
        },
      });
    });
  }

  async createAdminAuditLog(data: {
    adminId: string;
    action: string;
    entityId: string;
    changes?: Record<string, unknown>;
    ip?: string;
    browser?: string;
  }) {
    await prisma.auditLog.create({
      data: {
        userId: data.adminId,
        action: data.action,
        entity: 'user',
        entityId: data.entityId,
        ...(data.changes !== undefined && { changes: data.changes as Prisma.InputJsonValue }),
        ...(data.ip !== undefined && { ip: data.ip }),
        ...(data.browser !== undefined && { browser: data.browser }),
      },
    });
  }
}

export const usersRepository = new UsersRepository();

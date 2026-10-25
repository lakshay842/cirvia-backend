import { prisma } from '@database/index.js';
import { AccountStatus, type DevicePlatform, type Prisma } from '@prisma/client';
import { hashToken } from '../../../providers/redis/auth.redis.js';

const userWithAuthInclude = {
  profile: true,
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

export type UserWithAuth = Prisma.UserGetPayload<{ include: typeof userWithAuthInclude }>;

export class AuthRepository {
  async findByEmail(email: string): Promise<UserWithAuth | null> {
    return prisma.user.findFirst({
      where: { email, deletedAt: null, isDeleted: false },
      include: userWithAuthInclude,
    });
  }

  async findByPhone(phone: string): Promise<UserWithAuth | null> {
    return prisma.user.findFirst({
      where: { phone, deletedAt: null, isDeleted: false },
      include: userWithAuthInclude,
    });
  }

  async findById(id: string): Promise<UserWithAuth | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null, isDeleted: false },
      include: userWithAuthInclude,
    });
  }

  async findByUsername(username: string): Promise<UserWithAuth | null> {
    return prisma.user.findFirst({
      where: {
        profile: { username },
        deletedAt: null,
        isDeleted: false,
      },
      include: userWithAuthInclude,
    });
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { email } });
    return count > 0;
  }

  async phoneExists(phone: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { phone } });
    return count > 0;
  }

  async usernameExists(username: string): Promise<boolean> {
    const count = await prisma.userProfile.count({ where: { username } });
    return count > 0;
  }

  async createUser(data: {
    email: string;
    phone: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    username: string;
  }): Promise<UserWithAuth> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          phone: data.phone,
          passwordHash: data.passwordHash,
          provider: 'EMAIL',
        },
      });

      await tx.userProfile.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          username: data.username,
        },
      });

      const userRole = await tx.role.findUnique({ where: { name: 'USER' } });
      if (userRole) {
        await tx.userRole.create({
          data: { userId: user.id, roleId: userRole.id },
        });
      }

      await tx.trustScore.create({ data: { userId: user.id, score: 50 } });
      await tx.notificationPreference.create({ data: { userId: user.id } });
      await tx.userPrivacySetting.create({ data: { userId: user.id } });
      await tx.userAccountSetting.create({ data: { userId: user.id } });

      const created = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userWithAuthInclude,
      });
      return created;
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }

  async createSession(data: {
    userId: string;
    refreshToken: string;
    deviceType: DevicePlatform;
    deviceName?: string;
    browser?: string;
    operatingSystem?: string;
    ipAddress?: string;
    country?: string;
    city?: string;
    expiresAt: Date;
  }) {
    return prisma.userSession.create({
      data: {
        userId: data.userId,
        refreshToken: hashToken(data.refreshToken),
        deviceType: data.deviceType,
        expiresAt: data.expiresAt,
        ...(data.deviceName !== undefined && { deviceName: data.deviceName }),
        ...(data.browser !== undefined && { browser: data.browser }),
        ...(data.operatingSystem !== undefined && { operatingSystem: data.operatingSystem }),
        ...(data.ipAddress !== undefined && { ipAddress: data.ipAddress }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.city !== undefined && { city: data.city }),
      },
    });
  }

  async findSessionByRefreshToken(refreshToken: string) {
    return prisma.userSession.findFirst({
      where: {
        refreshToken: hashToken(refreshToken),
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findSessionById(sessionId: string) {
    return prisma.userSession.findFirst({
      where: { id: sessionId, deletedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { deletedAt: new Date() },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<string[]> {
    const sessions = await prisma.userSession.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    await prisma.userSession.updateMany({
      where: { userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return sessions.map((s) => s.id);
  }

  async getUserSessions(userId: string) {
    return prisma.userSession.findMany({
      where: { userId, deletedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastActive: 'desc' },
    });
  }

  async upsertUserDevice(data: {
    userId: string;
    deviceId: string;
    deviceName?: string;
    platform: DevicePlatform;
  }): Promise<void> {
    await prisma.userDevice.upsert({
      where: {
        userId_deviceId: { userId: data.userId, deviceId: data.deviceId },
      },
      update: {
        lastLogin: new Date(),
        ...(data.deviceName !== undefined && { deviceName: data.deviceName }),
      },
      create: {
        userId: data.userId,
        deviceId: data.deviceId,
        platform: data.platform,
        ...(data.deviceName !== undefined && { deviceName: data.deviceName }),
        lastLogin: new Date(),
      },
    });
  }

  async softDeleteAccount(userId: string): Promise<void> {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          accountStatus: AccountStatus.DELETED,
        },
      }),
      prisma.userProfile.updateMany({
        where: { userId },
        data: { deletedAt: new Date() },
      }),
    ]);
  }

  async updateSessionRefreshToken(sessionId: string, refreshToken: string, expiresAt: Date): Promise<void> {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { refreshToken: hashToken(refreshToken), expiresAt, lastActive: new Date() },
    });
  }

  async createEmailVerification(userId: string, token: string, expiresAt: Date) {
    await prisma.emailVerification.deleteMany({ where: { userId, verifiedAt: null } });
    return prisma.emailVerification.create({
      data: { userId, token, expiresAt },
    });
  }

  async findEmailVerificationByToken(token: string) {
    return prisma.emailVerification.findFirst({
      where: { token, verifiedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
  }

  async markEmailVerified(userId: string, token: string): Promise<void> {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerification.updateMany({
        where: { userId, token },
        data: { verifiedAt: new Date() },
      }),
    ]);
  }

  async markPhoneVerified(userId: string, phone: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { phone, phoneVerified: true },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
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
    device?: string;
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
        ...(data.device !== undefined && { device: data.device }),
      },
    });
  }
}

export const authRepository = new AuthRepository();

export function extractRolesAndPermissions(user: UserWithAuth): {
  roles: string[];
  permissions: string[];
} {
  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissionSet = new Set<string>();
  for (const userRole of user.userRoles) {
    for (const rp of userRole.role.rolePermissions) {
      permissionSet.add(`${rp.permission.module}.${rp.permission.action}`);
    }
  }
  return { roles, permissions: Array.from(permissionSet) };
}

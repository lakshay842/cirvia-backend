import { prisma } from '@database/index.js';
import type {
  HostAccountStatus,
  HostBadgeType,
  HostDocumentType,
  HostMediaType,
  Prisma,
  VerificationStatus,
} from '@prisma/client';

const hostInclude = {
  addresses: true,
  badges: true,
  analytics: true,
  media: { orderBy: { sortOrder: 'asc' as const } },
  documents: true,
  user: { include: { profile: true, trustScore: true } },
} satisfies Prisma.HostProfileInclude;

export type HostWithRelations = Prisma.HostProfileGetPayload<{ include: typeof hostInclude }>;

export class HostsRepository {
  async findByUserId(userId: string): Promise<HostWithRelations | null> {
    return prisma.hostProfile.findFirst({
      where: { userId, deletedAt: null },
      include: hostInclude,
    });
  }

  async findBySlug(slug: string, verifiedOnly = true): Promise<HostWithRelations | null> {
    return prisma.hostProfile.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...(verifiedOnly ? { accountStatus: 'VERIFIED' } : {}),
      },
      include: hostInclude,
    });
  }

  async findById(hostId: string): Promise<HostWithRelations | null> {
    return prisma.hostProfile.findFirst({
      where: { id: hostId, deletedAt: null },
      include: hostInclude,
    });
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await prisma.hostProfile.count({ where: { slug } });
    return count > 0;
  }

  async userHasHostProfile(userId: string): Promise<boolean> {
    const count = await prisma.hostProfile.count({ where: { userId, deletedAt: null } });
    return count > 0;
  }

  async createHost(data: {
    userId: string;
    slug: string;
    displayName: string;
    bio: string;
    hostingExperience: string;
    languages: string[];
    interests: string[];
    emergencyContactName: string;
    emergencyContactPhone: string;
    address: {
      addressLine1: string;
      addressLine2?: string;
      landmark?: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
      latitude?: number;
      longitude?: number;
    };
  }): Promise<HostWithRelations> {
    return prisma.$transaction(async (tx) => {
      const host = await tx.hostProfile.create({
        data: {
          userId: data.userId,
          slug: data.slug,
          displayName: data.displayName,
          bio: data.bio,
          hostingExperience: data.hostingExperience,
          languages: data.languages,
          interests: data.interests,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          hostSince: new Date(),
          accountStatus: 'PENDING',
          verificationStatus: 'PENDING',
          createdBy: data.userId,
          preferencesJson: {
            notifyBookings: true,
            notifyReviews: true,
            autoApproveBookings: false,
            publicProfile: true,
            showEmail: false,
            showPhone: false,
          },
        },
      });

      await tx.hostAddress.create({
        data: {
          hostId: host.id,
          addressLine1: data.address.addressLine1,
          city: data.address.city,
          state: data.address.state,
          country: data.address.country,
          postalCode: data.address.postalCode,
          ...(data.address.addressLine2 !== undefined && { addressLine2: data.address.addressLine2 }),
          ...(data.address.landmark !== undefined && { landmark: data.address.landmark }),
          ...(data.address.latitude !== undefined && { latitude: data.address.latitude }),
          ...(data.address.longitude !== undefined && { longitude: data.address.longitude }),
        },
      });

      await tx.hostAnalytics.create({ data: { hostId: host.id } });

      await tx.hostBadge.create({
        data: { hostId: host.id, badgeType: 'NEW_HOST' },
      });

      const hostRole = await tx.role.findUnique({ where: { name: 'HOST' } });
      if (hostRole) {
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: data.userId, roleId: hostRole.id } },
          create: { userId: data.userId, roleId: hostRole.id },
          update: {},
        });
      }

      return tx.hostProfile.findUniqueOrThrow({
        where: { id: host.id },
        include: hostInclude,
      });
    });
  }

  async updateHost(hostId: string, userId: string, data: Prisma.HostProfileUpdateInput) {
    return prisma.hostProfile.update({
      where: { id: hostId },
      data: { ...data, updatedBy: userId },
      include: hostInclude,
    });
  }

  async upsertAddress(hostId: string, data: Prisma.HostAddressUpdateInput) {
    const existing = await prisma.hostAddress.findFirst({ where: { hostId } });
    if (existing) {
      return prisma.hostAddress.update({ where: { id: existing.id }, data });
    }
    return prisma.hostAddress.create({
      data: {
        hostId,
        addressLine1: (data.addressLine1 as string) ?? '',
        city: (data.city as string) ?? '',
        state: (data.state as string) ?? '',
        country: (data.country as string) ?? '',
        postalCode: (data.postalCode as string) ?? '',
        ...(data.addressLine2 !== undefined && { addressLine2: data.addressLine2 as string }),
        ...(data.landmark !== undefined && { landmark: data.landmark as string }),
      },
    });
  }

  async updateAccountStatus(
    hostId: string,
    status: HostAccountStatus,
    verificationStatus?: VerificationStatus,
    updatedBy?: string,
  ) {
    const data: Prisma.HostProfileUpdateInput = { accountStatus: status };
    if (verificationStatus) data.verificationStatus = verificationStatus;
    if (updatedBy) data.updatedBy = updatedBy;
    if (status === 'VERIFIED') data.hostSince = new Date();

    return prisma.hostProfile.update({
      where: { id: hostId },
      data,
      include: hostInclude,
    });
  }

  async addBadge(hostId: string, badgeType: HostBadgeType) {
    return prisma.hostBadge.upsert({
      where: { hostId_badgeType: { hostId, badgeType } },
      create: { hostId, badgeType },
      update: {},
    });
  }

  async addMedia(hostId: string, mediaType: HostMediaType, storageKey: string, sortOrder = 0) {
    return prisma.hostMedia.create({
      data: { hostId, mediaType, storageKey, sortOrder },
    });
  }

  async deleteMedia(mediaId: string, hostId: string): Promise<boolean> {
    const result = await prisma.hostMedia.deleteMany({ where: { id: mediaId, hostId } });
    return result.count > 0;
  }

  async listGallery(hostId: string) {
    return prisma.hostMedia.findMany({
      where: { hostId, mediaType: 'GALLERY' },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async addDocument(
    hostId: string,
    documentType: HostDocumentType,
    storageKey: string,
    fileName: string,
    mime: string,
  ) {
    return prisma.hostDocument.create({
      data: { hostId, documentType, storageKey, fileName, mime },
    });
  }

  async listDocuments(hostId: string) {
    return prisma.hostDocument.findMany({ where: { hostId }, orderBy: { createdAt: 'desc' } });
  }

  async createActivity(hostId: string, activityType: string, metadata?: Record<string, unknown>) {
    return prisma.hostActivity.create({
      data: {
        hostId,
        activityType,
        ...(metadata !== undefined && { metadataJson: metadata as Prisma.InputJsonValue }),
      },
    });
  }

  async listActivities(hostId: string, skip: number, take: number) {
    return prisma.hostActivity.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async countActivities(hostId: string): Promise<number> {
    return prisma.hostActivity.count({ where: { hostId } });
  }

  async listAdminHosts(status: HostAccountStatus | undefined, skip: number, take: number) {
    return prisma.hostProfile.findMany({
      where: {
        deletedAt: null,
        ...(status ? { accountStatus: status } : { accountStatus: { in: ['PENDING', 'VERIFIED'] } }),
      },
      include: hostInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async countAdminHosts(status?: HostAccountStatus): Promise<number> {
    return prisma.hostProfile.count({
      where: {
        deletedAt: null,
        ...(status ? { accountStatus: status } : { accountStatus: { in: ['PENDING', 'VERIFIED'] } }),
      },
    });
  }

  async getKycStatus(userId: string): Promise<VerificationStatus | null> {
    const kyc = await prisma.verificationRequest.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return kyc?.status ?? null;
  }

  async updateVerificationStatusByUserId(userId: string, verificationStatus: VerificationStatus) {
    const host = await prisma.hostProfile.findFirst({
      where: { userId, deletedAt: null },
    });
    if (!host) return null;

    return prisma.hostProfile.update({
      where: { id: host.id },
      data: { verificationStatus },
    });
  }

  async createAuditLog(data: {
    userId?: string;
    action: string;
    entityId: string;
    changes?: Record<string, unknown>;
    ip?: string;
    browser?: string;
  }) {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        entity: 'host_profile',
        entityId: data.entityId,
        ...(data.userId !== undefined && { userId: data.userId }),
        ...(data.changes !== undefined && { changes: data.changes as Prisma.InputJsonValue }),
        ...(data.ip !== undefined && { ip: data.ip }),
        ...(data.browser !== undefined && { browser: data.browser }),
      },
    });
  }

  async createNotification(userId: string, title: string, message: string, dataJson?: Record<string, unknown>) {
    return prisma.notification.create({
      data: {
        userId,
        type: 'VERIFICATION',
        title,
        message,
        priority: 'HIGH',
        ...(dataJson !== undefined && { dataJson: dataJson as Prisma.InputJsonValue }),
      },
    });
  }

  async getUserEmail(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    return user?.email ?? null;
  }
}

export const hostsRepository = new HostsRepository();

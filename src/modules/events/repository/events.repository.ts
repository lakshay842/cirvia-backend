import { prisma } from '@database/index.js';
import type { EventStatus, EventVisibility, Prisma } from '@prisma/client';

export const eventInclude = {
  category: true,
  host: true,
  location: true,
  media: { orderBy: { sortOrder: 'asc' as const } },
  rules: { orderBy: { displayOrder: 'asc' as const } },
  tagMappings: { include: { tag: true } },
  analytics: true,
} satisfies Prisma.EventInclude;

export type EventWithRelations = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

const notDeleted = { deletedAt: null } as const;

export class EventsRepository {
  async findById(eventId: string): Promise<EventWithRelations | null> {
    return prisma.event.findFirst({
      where: { id: eventId, ...notDeleted },
      include: eventInclude,
    });
  }

  async findBySlug(slug: string, publicOnly = false): Promise<EventWithRelations | null> {
    return prisma.event.findFirst({
      where: {
        slug,
        ...notDeleted,
        ...(publicOnly
          ? {
              isSuspended: false,
              status: { in: ['PUBLISHED', 'BOOKING_OPEN', 'BOOKING_CLOSED', 'EVENT_STARTED', 'CHECK_IN'] },
              host: { accountStatus: 'VERIFIED', deletedAt: null },
            }
          : {}),
      },
      include: eventInclude,
    });
  }

  async slugExists(slug: string): Promise<boolean> {
    return (await prisma.event.count({ where: { slug } })) > 0;
  }

  async findCategoryById(categoryId: string) {
    return prisma.category.findFirst({ where: { id: categoryId, isActive: true } });
  }

  async findCategoryBySlug(slug: string) {
    return prisma.category.findFirst({ where: { slug, isActive: true } });
  }

  async listCategories() {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findHostByUserId(userId: string) {
    return prisma.hostProfile.findFirst({ where: { userId, deletedAt: null } });
  }

  async createEvent(data: {
    hostId: string;
    categoryId: string;
    slug: string;
    title: string;
    description: string;
    shortDescription?: string;
    visibility: EventVisibility;
    approvalRequired: boolean;
    minimumAge?: number;
    maximumAge?: number;
    language?: string;
    timezone: string;
    capacity: number;
    price: number;
    currency: string;
    bookingStart: Date;
    bookingEnd: Date;
    eventStart: Date;
    eventEnd: Date;
    dressCode?: string;
    foodProvided?: boolean;
    parkingAvailable?: boolean;
    petsAllowed?: boolean;
    smokingAllowed?: boolean;
    amenities?: string[];
    createdBy: string;
    location: {
      venueName: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
      latitude?: number;
      longitude?: number;
      googlePlaceId?: string;
      mapUrl?: string;
      isPrivateAddress?: boolean;
    };
    rules?: Array<{ title: string; description?: string; displayOrder?: number }>;
    tags?: string[];
  }): Promise<EventWithRelations> {
    return prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          hostId: data.hostId,
          categoryId: data.categoryId,
          slug: data.slug,
          title: data.title,
          description: data.description,
          ...(data.shortDescription !== undefined && { shortDescription: data.shortDescription }),
          visibility: data.visibility,
          approvalRequired: data.approvalRequired,
          ...(data.minimumAge !== undefined && { minimumAge: data.minimumAge }),
          ...(data.maximumAge !== undefined && { maximumAge: data.maximumAge }),
          ...(data.language !== undefined && { language: data.language }),
          timezone: data.timezone,
          capacity: data.capacity,
          remainingCapacity: data.capacity,
          price: data.price,
          currency: data.currency,
          bookingStart: data.bookingStart,
          bookingEnd: data.bookingEnd,
          eventStart: data.eventStart,
          eventEnd: data.eventEnd,
          ...(data.dressCode !== undefined && { dressCode: data.dressCode }),
          foodProvided: data.foodProvided ?? false,
          parkingAvailable: data.parkingAvailable ?? false,
          petsAllowed: data.petsAllowed ?? false,
          smokingAllowed: data.smokingAllowed ?? false,
          ...(data.amenities !== undefined && {
            amenitiesJson: data.amenities as Prisma.InputJsonValue,
          }),
          createdBy: data.createdBy,
          status: 'DRAFT',
        },
      });

      await tx.eventLocation.create({
        data: {
          eventId: event.id,
          venueName: data.location.venueName,
          addressLine1: data.location.addressLine1,
          city: data.location.city,
          state: data.location.state,
          country: data.location.country,
          postalCode: data.location.postalCode,
          ...(data.location.addressLine2 !== undefined && {
            addressLine2: data.location.addressLine2,
          }),
          ...(data.location.latitude !== undefined && { latitude: data.location.latitude }),
          ...(data.location.longitude !== undefined && { longitude: data.location.longitude }),
          ...(data.location.googlePlaceId !== undefined && {
            googlePlaceId: data.location.googlePlaceId,
          }),
          ...(data.location.mapUrl !== undefined && { mapUrl: data.location.mapUrl }),
          isPrivateAddress: data.location.isPrivateAddress ?? false,
        },
      });

      await tx.eventAnalytics.create({ data: { eventId: event.id } });

      if (data.rules?.length) {
        await tx.eventRule.createMany({
          data: data.rules.map((r, i) => ({
            eventId: event.id,
            title: r.title,
            ...(r.description !== undefined && { description: r.description }),
            displayOrder: r.displayOrder ?? i,
          })),
        });
      }

      if (data.tags?.length) {
        for (const tagName of data.tags) {
          const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const tag = await tx.eventTag.upsert({
            where: { slug: tagSlug },
            create: { name: tagName, slug: tagSlug },
            update: {},
          });
          await tx.eventTagMapping.upsert({
            where: { eventId_tagId: { eventId: event.id, tagId: tag.id } },
            create: { eventId: event.id, tagId: tag.id },
            update: {},
          });
        }
      }

      return tx.event.findUniqueOrThrow({ where: { id: event.id }, include: eventInclude });
    });
  }

  async updateEvent(eventId: string, userId: string, data: Prisma.EventUpdateInput) {
    return prisma.event.update({
      where: { id: eventId },
      data: { ...data, updatedBy: userId },
      include: eventInclude,
    });
  }

  async softDelete(eventId: string, userId: string) {
    return prisma.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date(), updatedBy: userId },
      include: eventInclude,
    });
  }

  async updateLocation(eventId: string, data: Prisma.EventLocationUpdateInput) {
    return prisma.eventLocation.update({ where: { eventId }, data });
  }

  async replaceRules(eventId: string, rules: Array<{ title: string; description?: string; displayOrder?: number }>) {
    await prisma.eventRule.deleteMany({ where: { eventId } });
    if (rules.length === 0) return;
    await prisma.eventRule.createMany({
      data: rules.map((r, i) => ({
        eventId,
        title: r.title,
        ...(r.description !== undefined && { description: r.description }),
        displayOrder: r.displayOrder ?? i,
      })),
    });
  }

  async replaceTags(eventId: string, tags: string[]) {
    await prisma.eventTagMapping.deleteMany({ where: { eventId } });
    for (const tagName of tags) {
      const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const tag = await prisma.eventTag.upsert({
        where: { slug: tagSlug },
        create: { name: tagName, slug: tagSlug },
        update: {},
      });
      await prisma.eventTagMapping.create({ data: { eventId, tagId: tag.id } });
    }
  }

  async listHostEvents(hostId: string, status: EventStatus | undefined, skip: number, take: number) {
    return prisma.event.findMany({
      where: {
        hostId,
        ...notDeleted,
        ...(status ? { status } : {}),
      },
      include: eventInclude,
      orderBy: { eventStart: 'desc' },
      skip,
      take,
    });
  }

  async countHostEvents(hostId: string, status?: EventStatus) {
    return prisma.event.count({
      where: { hostId, ...notDeleted, ...(status ? { status } : {}) },
    });
  }

  async listPublicEvents(where: Prisma.EventWhereInput, skip: number, take: number, orderBy: Prisma.EventOrderByWithRelationInput) {
    return prisma.event.findMany({
      where: { ...where, ...notDeleted, isSuspended: false },
      include: eventInclude,
      orderBy,
      skip,
      take,
    });
  }

  async countPublicEvents(where: Prisma.EventWhereInput) {
    return prisma.event.count({ where: { ...where, ...notDeleted, isSuspended: false } });
  }

  async listFeatured(limit: number) {
    return prisma.event.findMany({
      where: {
        ...notDeleted,
        isSuspended: false,
        isFeatured: true,
        status: { in: ['PUBLISHED', 'BOOKING_OPEN', 'BOOKING_CLOSED', 'EVENT_STARTED'] },
        host: { accountStatus: 'VERIFIED', deletedAt: null },
        visibility: 'PUBLIC',
        eventStart: { gte: new Date() },
      },
      include: eventInclude,
      orderBy: { eventStart: 'asc' },
      take: limit,
    });
  }

  async listTrending(limit: number) {
    return prisma.event.findMany({
      where: {
        ...notDeleted,
        isSuspended: false,
        isTrending: true,
        status: { in: ['PUBLISHED', 'BOOKING_OPEN', 'BOOKING_CLOSED', 'EVENT_STARTED'] },
        host: { accountStatus: 'VERIFIED', deletedAt: null },
        visibility: 'PUBLIC',
      },
      include: eventInclude,
      orderBy: [{ isTrending: 'desc' }, { eventStart: 'asc' }],
      take: limit,
    });
  }

  async listPendingReview(skip: number, take: number) {
    return prisma.event.findMany({
      where: { status: 'PENDING_REVIEW', ...notDeleted },
      include: eventInclude,
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    });
  }

  async countPendingReview() {
    return prisma.event.count({ where: { status: 'PENDING_REVIEW', ...notDeleted } });
  }

  async addMedia(eventId: string, data: {
    mediaType: 'IMAGE' | 'VIDEO';
    fileUrl: string;
    thumbnailUrl?: string;
    sortOrder: number;
    isCover: boolean;
    uploadedBy: string;
  }) {
    return prisma.eventMedia.create({
      data: {
        eventId,
        mediaType: data.mediaType,
        fileUrl: data.fileUrl,
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
        sortOrder: data.sortOrder,
        isCover: data.isCover,
        uploadedBy: data.uploadedBy,
      },
    });
  }

  async findMedia(mediaId: string) {
    return prisma.eventMedia.findUnique({ where: { id: mediaId }, include: { event: true } });
  }

  async deleteMedia(mediaId: string, eventId: string) {
    const result = await prisma.eventMedia.deleteMany({ where: { id: mediaId, eventId } });
    return result.count > 0;
  }

  async reorderMedia(eventId: string, items: Array<{ id: string; order: number }>) {
    await prisma.$transaction(
      items.map((item) =>
        prisma.eventMedia.update({
          where: { id: item.id, eventId },
          data: { sortOrder: item.order },
        }),
      ),
    );
  }

  async clearCoverFlags(eventId: string) {
    await prisma.eventMedia.updateMany({ where: { eventId }, data: { isCover: false } });
  }

  async duplicateEvent(source: EventWithRelations, newSlug: string, userId: string) {
    return this.createEvent({
      hostId: source.hostId,
      categoryId: source.categoryId,
      slug: newSlug,
      title: `${source.title} (Copy)`,
      description: source.description,
      ...(source.shortDescription && { shortDescription: source.shortDescription }),
      visibility: source.visibility,
      approvalRequired: source.approvalRequired,
      ...(source.minimumAge !== null && source.minimumAge !== undefined && { minimumAge: source.minimumAge }),
      ...(source.maximumAge !== null && source.maximumAge !== undefined && { maximumAge: source.maximumAge }),
      ...(source.language && { language: source.language }),
      timezone: source.timezone,
      capacity: source.capacity,
      price: Number(source.price),
      currency: source.currency,
      bookingStart: source.bookingStart,
      bookingEnd: source.bookingEnd,
      eventStart: source.eventStart,
      eventEnd: source.eventEnd,
      ...(source.dressCode && { dressCode: source.dressCode }),
      foodProvided: source.foodProvided,
      parkingAvailable: source.parkingAvailable,
      petsAllowed: source.petsAllowed,
      smokingAllowed: source.smokingAllowed,
      amenities: Array.isArray(source.amenitiesJson)
        ? (source.amenitiesJson as string[])
        : [],
      createdBy: userId,
      location: source.location
        ? {
            venueName: source.location.venueName,
            addressLine1: source.location.addressLine1,
            ...(source.location.addressLine2 && { addressLine2: source.location.addressLine2 }),
            city: source.location.city,
            state: source.location.state,
            country: source.location.country,
            postalCode: source.location.postalCode,
            ...(source.location.latitude && { latitude: Number(source.location.latitude) }),
            ...(source.location.longitude && { longitude: Number(source.location.longitude) }),
            isPrivateAddress: source.location.isPrivateAddress,
          }
        : {
            venueName: 'TBD',
            addressLine1: 'TBD',
            city: 'TBD',
            state: 'TBD',
            country: 'TBD',
            postalCode: '000000',
          },
      rules: source.rules.map((r) => ({
        title: r.title,
        ...(r.description && { description: r.description }),
        displayOrder: r.displayOrder,
      })),
      tags: source.tagMappings.map((m) => m.tag.name),
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
        entity: 'event',
        entityId: data.entityId,
        ...(data.userId !== undefined && { userId: data.userId }),
        ...(data.changes !== undefined && { changes: data.changes as Prisma.InputJsonValue }),
        ...(data.ip !== undefined && { ip: data.ip }),
        ...(data.browser !== undefined && { browser: data.browser }),
      },
    });
  }

  async incrementAnalyticsViews(eventId: string) {
    await prisma.eventAnalytics.upsert({
      where: { eventId },
      create: { eventId, views: 1 },
      update: { views: { increment: 1 } },
    });
  }
}

export const eventsRepository = new EventsRepository();

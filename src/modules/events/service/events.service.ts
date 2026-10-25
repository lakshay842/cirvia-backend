import { randomUUID } from 'node:crypto';
import type { EventStatus, Prisma } from '@prisma/client';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@errors/index.js';
import { getRedisClient } from '@redis/index.js';
import { s3StorageProvider } from '../../../providers/storage/s3.provider.js';
import { buildPaginationMeta, parsePagination } from '../../../utils/pagination.util.js';
import { sanitizeString } from '../../../utils/sanitize.util.js';
import { validateImageDimensions } from '../../../utils/image-dimension.util.js';
import { EVENTS_CONSTANTS } from '../constants/events.constants.js';
import { eventsRepository } from '../repository/events.repository.js';
import {
  toListItemDto,
  toMediaDto,
  toPrivateEventDto,
  toPublicEventDto,
} from '../dto/events.dto.js';
import { emitEventDomainEvent } from '../events/events.events.js';
import {
  generateEventSlug,
  haversineKm,
  hashQuery,
  parseEventDateTime,
} from '../utils/events.util.js';
import type {
  CancelEventInput,
  CreateEventInput,
  HostEventsQuery,
  NearbyEventsQuery,
  PublicEventsQuery,
  RejectEventInput,
  ReorderMediaInput,
  SearchEventsQuery,
  UpdateEventInput,
  UpdateEventLocationInput,
  AddRuleInput,
  AddTagsInput,
} from '../schemas/events.schema.js';
import type { EventAnalyticsPlaceholder, UploadedEventFile } from '../types/events.types.js';

interface AuditMeta {
  ip?: string;
  browser?: string;
}

const HOST_STATUS_MAP: Record<string, EventStatus> = {
  draft: 'DRAFT',
  pending_review: 'PENDING_REVIEW',
  published: 'PUBLISHED',
  booking_open: 'BOOKING_OPEN',
  booking_closed: 'BOOKING_CLOSED',
  cancelled: 'CANCELLED',
  completed: 'COMPLETED',
  archived: 'ARCHIVED',
};

export class EventsService {
  // ─── Host CRUD ─────────────────────────────────────────────────────────────

  async createEvent(userId: string, input: CreateEventInput, audit?: AuditMeta) {
    const host = await this.requireVerifiedHost(userId);
    const category = await eventsRepository.findCategoryById(input.categoryId);
    if (!category) throw new NotFoundError('Category not found.');

    const eventStart = parseEventDateTime(input.eventDate, input.startTime, input.timezone);
    const eventEnd = parseEventDateTime(input.eventDate, input.endTime, input.timezone);
    if (eventEnd <= eventStart) throw new ValidationError('End time must be after start time.');
    if (eventStart < new Date()) throw new ValidationError('Event date cannot be in the past.');

    const bookingStart = input.bookingStart ? new Date(input.bookingStart) : new Date();
    const bookingEnd = input.bookingEnd ? new Date(input.bookingEnd) : eventStart;
    if (bookingEnd > eventStart) {
      throw new ValidationError('Booking end must be before or at event start.');
    }

    const slug = await this.uniqueSlug(input.title, input.location.city);

    const event = await eventsRepository.createEvent({
      hostId: host.id,
      categoryId: input.categoryId,
      slug,
      title: sanitizeString(input.title),
      description: sanitizeString(input.description),
      ...(input.shortDescription !== undefined && {
        shortDescription: sanitizeString(input.shortDescription),
      }),
      visibility: input.visibility,
      approvalRequired: input.approvalRequired ?? input.visibility === 'APPROVAL_REQUIRED',
      ...(input.minimumAge !== undefined && { minimumAge: input.minimumAge }),
      ...(input.maximumAge !== undefined && { maximumAge: input.maximumAge }),
      ...(input.language !== undefined && { language: sanitizeString(input.language) }),
      timezone: input.timezone ?? EVENTS_CONSTANTS.DEFAULT_TIMEZONE,
      capacity: input.capacity,
      price: input.price,
      currency: input.currency ?? EVENTS_CONSTANTS.DEFAULT_CURRENCY,
      bookingStart,
      bookingEnd,
      eventStart,
      eventEnd,
      ...(input.dressCode !== undefined && { dressCode: sanitizeString(input.dressCode) }),
      foodProvided: input.foodProvided ?? false,
      parkingAvailable: input.parkingAvailable ?? false,
      petsAllowed: input.petsAllowed ?? false,
      smokingAllowed: input.smokingAllowed ?? false,
      ...(input.amenities !== undefined && { amenities: input.amenities.map(sanitizeString) }),
      createdBy: userId,
      location: {
        venueName: sanitizeString(input.location.venueName),
        addressLine1: sanitizeString(input.location.addressLine1),
        city: sanitizeString(input.location.city),
        state: sanitizeString(input.location.state),
        country: sanitizeString(input.location.country),
        postalCode: sanitizeString(input.location.postalCode),
        ...(input.location.addressLine2 !== undefined && {
          addressLine2: sanitizeString(input.location.addressLine2),
        }),
        ...(input.location.latitude !== undefined && { latitude: input.location.latitude }),
        ...(input.location.longitude !== undefined && { longitude: input.location.longitude }),
        ...(input.location.googlePlaceId !== undefined && {
          googlePlaceId: input.location.googlePlaceId,
        }),
        ...(input.location.mapUrl !== undefined && { mapUrl: input.location.mapUrl }),
        isPrivateAddress: input.location.isPrivateAddress ?? false,
      },
      ...(input.rules !== undefined && {
        rules: input.rules.map((r) => {
          const rule: { title: string; description?: string; displayOrder?: number } = {
            title: sanitizeString(r.title),
          };
          if (r.description !== undefined) rule.description = sanitizeString(r.description);
          if (r.displayOrder !== undefined) rule.displayOrder = r.displayOrder;
          return rule;
        }),
      }),
      ...(input.tags !== undefined && { tags: input.tags.map(sanitizeString) }),
    });

    await this.audit(userId, EVENTS_CONSTANTS.AUDIT_ACTIONS.CREATED, event.id, { slug }, audit);
    emitEventDomainEvent('event.created', { eventId: event.id, hostId: host.id });

    return { eventId: event.id, slug: event.slug, event: await this.buildPrivateEvent(event) };
  }

  async updateEvent(userId: string, eventId: string, input: UpdateEventInput, audit?: AuditMeta) {
    const { event } = await this.requireEventOwner(userId, eventId);
    this.assertEditable(event);

    const data: Prisma.EventUpdateInput = {};
    if (input.title !== undefined) data.title = sanitizeString(input.title);
    if (input.description !== undefined) data.description = sanitizeString(input.description);
    if (input.shortDescription !== undefined) data.shortDescription = sanitizeString(input.shortDescription);
    if (input.categoryId !== undefined) {
      const cat = await eventsRepository.findCategoryById(input.categoryId);
      if (!cat) throw new NotFoundError('Category not found.');
      data.category = { connect: { id: input.categoryId } };
    }
    if (input.capacity !== undefined) {
      const delta = input.capacity - event.capacity;
      data.capacity = input.capacity;
      data.remainingCapacity = Math.max(0, event.remainingCapacity + delta);
    }
    if (input.price !== undefined) data.price = input.price;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.approvalRequired !== undefined) data.approvalRequired = input.approvalRequired;
    if (input.minimumAge !== undefined) data.minimumAge = input.minimumAge;
    if (input.maximumAge !== undefined) data.maximumAge = input.maximumAge;
    if (input.language !== undefined) data.language = sanitizeString(input.language);
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.dressCode !== undefined) data.dressCode = sanitizeString(input.dressCode);
    if (input.foodProvided !== undefined) data.foodProvided = input.foodProvided;
    if (input.parkingAvailable !== undefined) data.parkingAvailable = input.parkingAvailable;
    if (input.petsAllowed !== undefined) data.petsAllowed = input.petsAllowed;
    if (input.smokingAllowed !== undefined) data.smokingAllowed = input.smokingAllowed;
    if (input.amenities !== undefined) data.amenitiesJson = input.amenities.map(sanitizeString);

    if (input.eventDate && input.startTime) {
      const tz = input.timezone ?? event.timezone;
      const eventStart = parseEventDateTime(input.eventDate, input.startTime, tz);
      if (eventStart < new Date()) throw new ValidationError('Event date cannot be in the past.');
      data.eventStart = eventStart;
    }
    if (input.eventDate && input.endTime) {
      const tz = input.timezone ?? event.timezone;
      data.eventEnd = parseEventDateTime(input.eventDate, input.endTime, tz);
    }
    if (input.bookingStart !== undefined) data.bookingStart = new Date(input.bookingStart);
    if (input.bookingEnd !== undefined) data.bookingEnd = new Date(input.bookingEnd);

    const updated = await eventsRepository.updateEvent(event.id, userId, data);
    if (input.rules) {
      const rules = input.rules.map((r) => {
        const rule: { title: string; description?: string; displayOrder?: number } = {
          title: sanitizeString(r.title),
        };
        if (r.description !== undefined) rule.description = sanitizeString(r.description);
        if (r.displayOrder !== undefined) rule.displayOrder = r.displayOrder;
        return rule;
      });
      await eventsRepository.replaceRules(event.id, rules);
    }
    if (input.tags) await eventsRepository.replaceTags(event.id, input.tags);

    await this.invalidateCache(event.slug);
    await this.audit(userId, EVENTS_CONSTANTS.AUDIT_ACTIONS.UPDATED, event.id, {}, audit);
    emitEventDomainEvent('event.updated', { eventId: event.id });

    return this.buildPrivateEvent(updated);
  }

  async deleteEvent(userId: string, eventId: string, audit?: AuditMeta) {
    const { event } = await this.requireEventOwner(userId, eventId);
    await eventsRepository.softDelete(event.id, userId);
    await this.invalidateCache(event.slug);
    await this.audit(userId, EVENTS_CONSTANTS.AUDIT_ACTIONS.DELETED, event.id, {}, audit);
    return { deleted: true };
  }

  async publishEvent(userId: string, eventId: string, audit?: AuditMeta) {
    const { event, host } = await this.requireEventOwner(userId, eventId);
    const blockedHostStatuses = ['REJECTED', 'SUSPENDED', 'INACTIVE', 'DELETED'] as const;
    if (blockedHostStatuses.includes(host.accountStatus as (typeof blockedHostStatuses)[number])) {
      throw new ForbiddenError('Your host account cannot publish events in its current status.');
    }
    if (!['DRAFT', 'PENDING_REVIEW'].includes(event.status)) {
      throw new ConflictError('Event cannot be published from current status.');
    }
    if (event.eventStart < new Date()) {
      throw new ValidationError('Cannot publish an event in the past.');
    }

    const now = new Date();
    const status: EventStatus =
      now >= event.bookingStart && now <= event.bookingEnd ? 'BOOKING_OPEN' : 'PUBLISHED';

    const updated = await eventsRepository.updateEvent(event.id, userId, {
      status,
      rejectionReason: null,
    });
    await this.invalidateAllListCaches();
    await this.invalidateCache(event.slug);
    await this.audit(userId, EVENTS_CONSTANTS.AUDIT_ACTIONS.PUBLISHED, event.id, {}, audit);
    emitEventDomainEvent('event.published', { eventId: event.id });
    return this.buildPrivateEvent(updated);
  }

  async unpublishEvent(userId: string, eventId: string, audit?: AuditMeta) {
    const { event } = await this.requireEventOwner(userId, eventId);
    if (!['PUBLISHED', 'BOOKING_OPEN', 'BOOKING_CLOSED', 'PENDING_REVIEW'].includes(event.status)) {
      throw new ConflictError('Event cannot be unpublished from current status.');
    }
    const updated = await eventsRepository.updateEvent(event.id, userId, { status: 'DRAFT' });
    await this.invalidateCache(event.slug);
    await this.audit(userId, EVENTS_CONSTANTS.AUDIT_ACTIONS.UNPUBLISHED, event.id, {}, audit);
    return this.buildPrivateEvent(updated);
  }

  async cancelEvent(userId: string, eventId: string, input: CancelEventInput, audit?: AuditMeta) {
    const { event } = await this.requireEventOwner(userId, eventId);
    if (event.status === 'CANCELLED') throw new ConflictError('Event is already cancelled.');
    if (event.status === 'COMPLETED') throw new ConflictError('Cannot cancel a completed event.');

    const updated = await eventsRepository.updateEvent(event.id, userId, {
      status: 'CANCELLED',
      cancelReason: sanitizeString(input.reason),
    });
    await this.invalidateCache(event.slug);
    await this.audit(userId, EVENTS_CONSTANTS.AUDIT_ACTIONS.CANCELLED, event.id, { reason: input.reason }, audit);
    emitEventDomainEvent('event.cancelled', { eventId: event.id, reason: input.reason });
    return this.buildPrivateEvent(updated);
  }

  async archiveEvent(userId: string, eventId: string, audit?: AuditMeta) {
    const { event } = await this.requireEventOwner(userId, eventId);
    if (!['COMPLETED', 'CANCELLED'].includes(event.status)) {
      throw new ConflictError('Only completed or cancelled events can be archived.');
    }
    const updated = await eventsRepository.updateEvent(event.id, userId, { status: 'ARCHIVED' });
    await this.invalidateCache(event.slug);
    await this.audit(userId, EVENTS_CONSTANTS.AUDIT_ACTIONS.ARCHIVED, event.id, {}, audit);
    return this.buildPrivateEvent(updated);
  }

  async duplicateEvent(userId: string, eventId: string, audit?: AuditMeta) {
    const { event } = await this.requireEventOwner(userId, eventId);
    const slug = await this.uniqueSlug(`${event.title} copy`, event.location?.city);
    const copy = await eventsRepository.duplicateEvent(event, slug, userId);
    await this.audit(userId, EVENTS_CONSTANTS.AUDIT_ACTIONS.DUPLICATED, copy.id, { sourceId: event.id }, audit);
    return this.buildPrivateEvent(copy);
  }

  async getEventById(userId: string, eventId: string) {
    const { event } = await this.requireEventOwner(userId, eventId);
    return this.buildPrivateEvent(event);
  }

  async listHostEvents(userId: string, query: HostEventsQuery) {
    const host = await this.requireVerifiedHost(userId);
    const paginationInput: { page?: number; limit?: number } = {};
    if (query.page !== undefined) paginationInput.page = query.page;
    if (query.limit !== undefined) paginationInput.limit = query.limit;
    const { page, limit, skip } = parsePagination(paginationInput, {
      page: EVENTS_CONSTANTS.DEFAULT_PAGE,
      limit: EVENTS_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: EVENTS_CONSTANTS.MAX_LIMIT,
    });
    const status = query.status ? HOST_STATUS_MAP[query.status] : undefined;
    const [events, total] = await Promise.all([
      eventsRepository.listHostEvents(host.id, status, skip, limit),
      eventsRepository.countHostEvents(host.id, status),
    ]);
    return {
      items: await Promise.all(events.map((e) => this.buildListItem(e))),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getHostAnalyticsPlaceholder(userId: string, eventId: string): Promise<EventAnalyticsPlaceholder> {
    await this.requireEventOwner(userId, eventId);
    const event = await eventsRepository.findById(eventId);
    const analytics = event?.analytics;
    return {
      views: analytics?.views ?? 0,
      bookings: analytics?.bookings ?? 0,
      attendance: analytics?.attendance ?? 0,
      shares: analytics?.shares ?? 0,
      reviews: analytics?.reviews ?? 0,
      revenuePlaceholder: 0,
      conversionRatePlaceholder: 0,
    };
  }

  // ─── Public discovery ────────────────────────────────────────────────────────

  async getPublicBySlug(slug: string) {
    const cached = await this.getCachedDetail(slug);
    if (cached) return cached;

    const event = await eventsRepository.findBySlug(slug, true);
    if (!event) throw new NotFoundError('Event not found.');
    if (event.visibility !== 'PUBLIC') throw new NotFoundError('Event not found.');

    await eventsRepository.incrementAnalyticsViews(event.id);
    const dto = await this.buildPublicEvent(event);
    await this.cacheDetail(slug, dto);
    return dto;
  }

  async getViewableBySlug(slug: string, userId?: string) {
    try {
      return await this.getPublicBySlug(slug);
    } catch (error) {
      if (!(error instanceof NotFoundError) || !userId) {
        throw error;
      }
    }

    const event = await eventsRepository.findBySlug(slug, false);
    if (!event) throw new NotFoundError('Event not found.');

    const host = await eventsRepository.findHostByUserId(userId);
    if (!host || event.hostId !== host.id) {
      throw new NotFoundError('Event not found.');
    }

    const dto = await this.buildPublicEvent(event);
    return { ...dto, isPreview: true };
  }

  async listPublicEvents(query: PublicEventsQuery) {
    const cacheKey = EVENTS_CONSTANTS.REDIS_KEYS.list(hashQuery(query as Record<string, unknown>));
    const cached = await this.getCachedList(cacheKey);
    if (cached) return cached;

    const result = await this.queryPublicEvents(query);
    await this.cacheList(cacheKey, result);
    return result;
  }

  async listFeatured(query: { page?: number; limit?: number }) {
    const cached = await this.getCachedList(EVENTS_CONSTANTS.REDIS_KEYS.featured);
    if (cached) return cached;

    const paginationInput: { page?: number; limit?: number } = {};
    if (query.page !== undefined) paginationInput.page = query.page;
    if (query.limit !== undefined) paginationInput.limit = query.limit;
    const { limit } = parsePagination(paginationInput, {
      page: 1,
      limit: 10,
      maxLimit: EVENTS_CONSTANTS.MAX_LIMIT,
    });

    const events = await eventsRepository.listFeatured(limit);
    const result = { items: await Promise.all(events.map((e) => this.buildListItem(e))) };
    await this.cacheList(EVENTS_CONSTANTS.REDIS_KEYS.featured, result);
    return result;
  }

  async listTrending(query: { page?: number; limit?: number }) {
    const cached = await this.getCachedList(EVENTS_CONSTANTS.REDIS_KEYS.trending);
    if (cached) return cached;

    const paginationInput: { page?: number; limit?: number } = {};
    if (query.page !== undefined) paginationInput.page = query.page;
    if (query.limit !== undefined) paginationInput.limit = query.limit;
    const { limit } = parsePagination(paginationInput, {
      page: 1,
      limit: 10,
      maxLimit: EVENTS_CONSTANTS.MAX_LIMIT,
    });

    const events = await eventsRepository.listTrending(limit);
    const result = { items: await Promise.all(events.map((e) => this.buildListItem(e))) };
    await this.cacheList(EVENTS_CONSTANTS.REDIS_KEYS.trending, result);
    return result;
  }

  async listNearby(query: NearbyEventsQuery) {
    const all = await eventsRepository.listPublicEvents(
      {
        status: { in: [...EVENTS_CONSTANTS.PUBLIC_STATUSES] },
        visibility: 'PUBLIC',
        host: { accountStatus: 'VERIFIED', deletedAt: null },
        eventStart: { gte: new Date() },
        location: { latitude: { not: null }, longitude: { not: null } },
      },
      0,
      200,
      { eventStart: 'asc' },
    );

    const withDistance = all
      .map((e) => {
        const lat = Number(e.location?.latitude);
        const lng = Number(e.location?.longitude);
        const dist = haversineKm(query.latitude, query.longitude, lat, lng);
        return { event: e, dist };
      })
      .filter((x) => x.dist <= query.radius)
      .sort((a, b) => a.dist - b.dist);

    const paginationInput: { page?: number; limit?: number } = {};
    if (query.page !== undefined) paginationInput.page = query.page;
    if (query.limit !== undefined) paginationInput.limit = query.limit;
    const { page, limit, skip } = parsePagination(paginationInput, {
      page: EVENTS_CONSTANTS.DEFAULT_PAGE,
      limit: EVENTS_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: EVENTS_CONSTANTS.MAX_LIMIT,
    });

    const slice = withDistance.slice(skip, skip + limit);
    return {
      items: await Promise.all(slice.map((x) => this.buildListItem(x.event))),
      meta: buildPaginationMeta(page, limit, withDistance.length),
    };
  }

  async searchEvents(query: SearchEventsQuery) {
    const publicQuery: PublicEventsQuery = {
      ...(query.page !== undefined && { page: query.page }),
      ...(query.limit !== undefined && { limit: query.limit }),
      ...(query.city !== undefined && { city: query.city }),
      ...(query.category !== undefined && { category: query.category }),
      ...(query.keyword !== undefined && { search: query.keyword }),
      ...(query.date !== undefined && { date: query.date }),
    };
    return this.listPublicEvents(publicQuery);
  }

  async listUpcoming(query: PublicEventsQuery) {
    return this.listPublicEvents({ ...query, date: 'upcoming' });
  }

  async listPast(query: PublicEventsQuery) {
    const paginationInput: { page?: number; limit?: number } = {};
    if (query.page !== undefined) paginationInput.page = query.page;
    if (query.limit !== undefined) paginationInput.limit = query.limit;
    const { page, limit, skip } = parsePagination(paginationInput, {
      page: EVENTS_CONSTANTS.DEFAULT_PAGE,
      limit: EVENTS_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: EVENTS_CONSTANTS.MAX_LIMIT,
    });

    const where = await this.buildPublicWhere({ ...query, date: 'past' });
    const [events, total] = await Promise.all([
      eventsRepository.listPublicEvents(where, skip, limit, { eventStart: 'desc' }),
      eventsRepository.countPublicEvents(where),
    ]);
    return {
      items: await Promise.all(events.map((e) => this.buildListItem(e))),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async listByCategorySlug(categorySlug: string, query: PublicEventsQuery) {
    return this.listPublicEvents({ ...query, category: categorySlug });
  }

  async listByCity(city: string, query: PublicEventsQuery) {
    return this.listPublicEvents({ ...query, city });
  }

  // ─── Location, rules, tags, media ────────────────────────────────────────────

  async updateLocation(userId: string, eventId: string, input: UpdateEventLocationInput, audit?: AuditMeta) {
    const { event } = await this.requireEventOwner(userId, eventId);
    this.assertEditable(event);
    await eventsRepository.updateLocation(event.id, {
      venueName: sanitizeString(input.venueName),
      addressLine1: sanitizeString(input.addressLine1),
      city: sanitizeString(input.city),
      state: sanitizeString(input.state),
      country: sanitizeString(input.country),
      postalCode: sanitizeString(input.postalCode),
      ...(input.addressLine2 !== undefined && { addressLine2: sanitizeString(input.addressLine2) }),
      ...(input.latitude !== undefined && { latitude: input.latitude }),
      ...(input.longitude !== undefined && { longitude: input.longitude }),
      ...(input.googlePlaceId !== undefined && { googlePlaceId: input.googlePlaceId }),
      ...(input.mapUrl !== undefined && { mapUrl: input.mapUrl }),
      ...(input.isPrivateAddress !== undefined && { isPrivateAddress: input.isPrivateAddress }),
    });
    await this.invalidateCache(event.slug);
    await this.audit(userId, EVENTS_CONSTANTS.AUDIT_ACTIONS.UPDATED, event.id, { section: 'location' }, audit);
    const updated = await eventsRepository.findById(event.id);
    return updated?.location;
  }

  async getLocation(userId: string, eventId: string) {
    const { event } = await this.requireEventOwner(userId, eventId);
    return event.location;
  }

  async addRule(userId: string, eventId: string, input: AddRuleInput) {
    const { event } = await this.requireEventOwner(userId, eventId);
    this.assertEditable(event);
    const rules = [
      ...event.rules.map((r) => ({
        title: r.title,
        ...(r.description && { description: r.description }),
        displayOrder: r.displayOrder,
      })),
      {
        title: sanitizeString(input.title),
        ...(input.description !== undefined && { description: sanitizeString(input.description) }),
        displayOrder: input.displayOrder ?? event.rules.length,
      },
    ];
    await eventsRepository.replaceRules(event.id, rules);
    const updated = await eventsRepository.findById(event.id);
    return updated?.rules ?? [];
  }

  async deleteRule(userId: string, eventId: string, ruleId: string) {
    const { event } = await this.requireEventOwner(userId, eventId);
    this.assertEditable(event);
    const rules = event.rules.filter((r) => r.id !== ruleId);
    await eventsRepository.replaceRules(event.id, rules.map((r) => ({
      title: r.title,
      ...(r.description && { description: r.description }),
      displayOrder: r.displayOrder,
    })));
    return { deleted: true };
  }

  async addTags(userId: string, eventId: string, input: AddTagsInput) {
    const { event } = await this.requireEventOwner(userId, eventId);
    this.assertEditable(event);
    const existing = event.tagMappings.map((m) => m.tag.name);
    await eventsRepository.replaceTags(event.id, [...new Set([...existing, ...input.tags])]);
    const updated = await eventsRepository.findById(event.id);
    return updated?.tagMappings.map((m) => m.tag) ?? [];
  }

  async removeTag(userId: string, eventId: string, tagId: string) {
    const { event } = await this.requireEventOwner(userId, eventId);
    this.assertEditable(event);
    const tags = event.tagMappings.filter((m) => m.tag.id !== tagId).map((m) => m.tag.name);
    await eventsRepository.replaceTags(event.id, tags);
    return { deleted: true };
  }

  async uploadMedia(
    userId: string,
    eventId: string,
    file: UploadedEventFile,
    isCover = false,
    audit?: AuditMeta,
  ) {
    const { event } = await this.requireEventOwner(userId, eventId);
    this.assertEditable(event);
    this.validateImage(file);

    if (event.media.length >= EVENTS_CONSTANTS.MAX_GALLERY_ITEMS) {
      throw new ValidationError(`Maximum ${EVENTS_CONSTANTS.MAX_GALLERY_ITEMS} media items allowed.`);
    }

    const ext = file.mimetype.split('/')[1] ?? 'jpg';
    const fileName = `${event.id}-${randomUUID()}.${ext}`;
    const folder = isCover ? EVENTS_CONSTANTS.S3_COVER_FOLDER : EVENTS_CONSTANTS.S3_GALLERY_FOLDER;
    const result = await s3StorageProvider.uploadFile(folder, fileName, file.buffer, file.mimetype);

    if (isCover) await eventsRepository.clearCoverFlags(event.id);

    const media = await eventsRepository.addMedia(event.id, {
      mediaType: 'IMAGE',
      fileUrl: result.key,
      sortOrder: event.media.length,
      isCover,
      uploadedBy: userId,
    });

    await this.invalidateCache(event.slug);
    await this.audit(userId, EVENTS_CONSTANTS.AUDIT_ACTIONS.MEDIA_UPLOADED, event.id, { mediaId: media.id }, audit);

    const url = await s3StorageProvider.getSignedUrl(result.key, EVENTS_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS);
    return toMediaDto(media, url);
  }

  async deleteMedia(userId: string, mediaId: string, audit?: AuditMeta) {
    const media = await eventsRepository.findMedia(mediaId);
    if (!media) throw new NotFoundError('Media not found.');
    await this.requireEventOwner(userId, media.eventId);
    const deleted = await eventsRepository.deleteMedia(mediaId, media.eventId);
    if (!deleted) throw new NotFoundError('Media not found.');
    await this.invalidateCache(media.event.slug);
    await this.audit(userId, EVENTS_CONSTANTS.AUDIT_ACTIONS.MEDIA_DELETED, media.eventId, { mediaId }, audit);
    return { deleted: true };
  }

  async reorderMedia(userId: string, eventId: string, input: ReorderMediaInput) {
    const { event } = await this.requireEventOwner(userId, eventId);
    await eventsRepository.reorderMedia(event.id, input.media.map((m) => ({ id: m.id, order: m.order })));
    await this.invalidateCache(event.slug);
    const updated = await eventsRepository.findById(event.id);
    return updated ? await this.resolveMedia(updated.media) : [];
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  async listPendingAdmin(query: { page?: number; limit?: number }) {
    const paginationInput: { page?: number; limit?: number } = {};
    if (query.page !== undefined) paginationInput.page = query.page;
    if (query.limit !== undefined) paginationInput.limit = query.limit;
    const { page, limit, skip } = parsePagination(paginationInput, {
      page: EVENTS_CONSTANTS.DEFAULT_PAGE,
      limit: EVENTS_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: EVENTS_CONSTANTS.MAX_LIMIT,
    });
    const [events, total] = await Promise.all([
      eventsRepository.listPendingReview(skip, limit),
      eventsRepository.countPendingReview(),
    ]);
    return {
      items: await Promise.all(events.map((e) => this.buildPrivateEvent(e))),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getAdminEvent(eventId: string) {
    const event = await eventsRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found.');
    return this.buildPrivateEvent(event);
  }

  async approveEvent(adminId: string, eventId: string, audit?: AuditMeta) {
    const event = await eventsRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found.');
    if (event.status !== 'PENDING_REVIEW') {
      throw new ConflictError('Event is not pending review.');
    }

    const now = new Date();
    const status: EventStatus =
      now >= event.bookingStart && now <= event.bookingEnd ? 'BOOKING_OPEN' : 'PUBLISHED';

    const updated = await eventsRepository.updateEvent(event.id, adminId, {
      status,
      rejectionReason: null,
    });
    await this.invalidateAllListCaches();
    await this.invalidateCache(event.slug);
    await this.audit(adminId, EVENTS_CONSTANTS.AUDIT_ACTIONS.APPROVED, event.id, {}, audit);
    emitEventDomainEvent('event.approved', { eventId: event.id });
    return this.buildPrivateEvent(updated);
  }

  async rejectEvent(adminId: string, eventId: string, input: RejectEventInput, audit?: AuditMeta) {
    const event = await eventsRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found.');

    const updated = await eventsRepository.updateEvent(event.id, adminId, {
      status: 'DRAFT',
      rejectionReason: sanitizeString(input.reason),
    });
    await this.invalidateCache(event.slug);
    await this.audit(adminId, EVENTS_CONSTANTS.AUDIT_ACTIONS.REJECTED, event.id, { reason: input.reason }, audit);
    emitEventDomainEvent('event.rejected', { eventId: event.id, reason: input.reason });
    return this.buildPrivateEvent(updated);
  }

  async featureEvent(adminId: string, eventId: string, audit?: AuditMeta) {
    const event = await eventsRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found.');
    const updated = await eventsRepository.updateEvent(event.id, adminId, { isFeatured: true });
    await this.invalidateAllListCaches();
    await this.audit(adminId, EVENTS_CONSTANTS.AUDIT_ACTIONS.FEATURED, event.id, {}, audit);
    emitEventDomainEvent('event.featured', { eventId: event.id });
    return this.buildPrivateEvent(updated);
  }

  async unfeatureEvent(adminId: string, eventId: string, audit?: AuditMeta) {
    const event = await eventsRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found.');
    const updated = await eventsRepository.updateEvent(event.id, adminId, { isFeatured: false });
    await this.invalidateAllListCaches();
    await this.audit(adminId, EVENTS_CONSTANTS.AUDIT_ACTIONS.UNFEATURED, event.id, {}, audit);
    return this.buildPrivateEvent(updated);
  }

  async suspendEvent(adminId: string, eventId: string, audit?: AuditMeta) {
    const event = await eventsRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found.');
    const updated = await eventsRepository.updateEvent(event.id, adminId, { isSuspended: true });
    await this.invalidateAllListCaches();
    await this.invalidateCache(event.slug);
    await this.audit(adminId, EVENTS_CONSTANTS.AUDIT_ACTIONS.SUSPENDED, event.id, {}, audit);
    return this.buildPrivateEvent(updated);
  }

  async restoreEvent(adminId: string, eventId: string, audit?: AuditMeta) {
    const event = await eventsRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found.');
    const updated = await eventsRepository.updateEvent(event.id, adminId, { isSuspended: false });
    await this.invalidateAllListCaches();
    await this.invalidateCache(event.slug);
    await this.audit(adminId, EVENTS_CONSTANTS.AUDIT_ACTIONS.RESTORED, event.id, {}, audit);
    return this.buildPrivateEvent(updated);
  }

  // ─── Categories (read-only) ──────────────────────────────────────────────────

  async listCategories() {
    return eventsRepository.listCategories();
  }

  async getCategoryBySlug(slug: string) {
    const category = await eventsRepository.findCategoryBySlug(slug);
    if (!category) throw new NotFoundError('Category not found.');
    return category;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async requireVerifiedHost(userId: string) {
    const host = await eventsRepository.findHostByUserId(userId);
    if (!host) throw new ForbiddenError('Host profile required.');
    return host;
  }

  private async requireEventOwner(userId: string, eventId: string) {
    const host = await eventsRepository.findHostByUserId(userId);
    if (!host) throw new ForbiddenError('Host profile required.');

    const event = await eventsRepository.findById(eventId);
    if (!event) throw new NotFoundError('Event not found.');

    const isAdmin = false; // admin override handled at route level
    if (event.hostId !== host.id && !isAdmin) {
      throw new ForbiddenError('You do not own this event.');
    }
    return { event, host };
  }

  private assertEditable(event: { status: EventStatus; isSuspended: boolean }) {
    if (event.isSuspended) throw new ForbiddenError('Event is suspended.');
    if (['CANCELLED', 'COMPLETED', 'ARCHIVED'].includes(event.status)) {
      throw new ForbiddenError('Event cannot be edited in current status.');
    }
  }

  private async uniqueSlug(title: string, city?: string) {
    let slug = generateEventSlug(title, city);
    let attempt = 0;
    while (await eventsRepository.slugExists(slug)) {
      attempt += 1;
      slug = generateEventSlug(title, `${city ?? 'event'}-${attempt}`);
    }
    return slug;
  }

  private async buildPublicEvent(event: Awaited<ReturnType<typeof eventsRepository.findById>>) {
    if (!event) throw new NotFoundError('Event not found.');
    const media = await this.resolveMedia(event.media);
    const hostImage = event.host.profileImage
      ? await s3StorageProvider.getSignedUrl(event.host.profileImage, EVENTS_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS)
      : null;
    return toPublicEventDto(event, { media, hostProfileImageUrl: hostImage });
  }

  private async buildPrivateEvent(event: NonNullable<Awaited<ReturnType<typeof eventsRepository.findById>>>) {
    const media = await this.resolveMedia(event.media);
    const hostImage = event.host.profileImage
      ? await s3StorageProvider.getSignedUrl(event.host.profileImage, EVENTS_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS)
      : null;
    return toPrivateEventDto(event, { media, hostProfileImageUrl: hostImage });
  }

  private async buildListItem(event: NonNullable<Awaited<ReturnType<typeof eventsRepository.findById>>>) {
    const cover = event.media.find((m) => m.isCover) ?? event.media[0];
    const coverUrl = cover
      ? await s3StorageProvider.getSignedUrl(cover.fileUrl, EVENTS_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS)
      : null;
    return toListItemDto(event, coverUrl);
  }

  private async resolveMedia(media: Array<{ id: string; mediaType: string; fileUrl: string; thumbnailUrl: string | null; sortOrder: number; isCover: boolean }>) {
    return Promise.all(
      media.map(async (m) => {
        const url = await s3StorageProvider.getSignedUrl(m.fileUrl, EVENTS_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS);
        const thumb = m.thumbnailUrl
          ? await s3StorageProvider.getSignedUrl(m.thumbnailUrl, EVENTS_CONSTANTS.SIGNED_URL_EXPIRY_SECONDS)
          : null;
        return toMediaDto(m as Parameters<typeof toMediaDto>[0], url, thumb);
      }),
    );
  }

  private async queryPublicEvents(query: PublicEventsQuery) {
    const paginationInput: { page?: number; limit?: number } = {};
    if (query.page !== undefined) paginationInput.page = query.page;
    if (query.limit !== undefined) paginationInput.limit = query.limit;
    const { page, limit, skip } = parsePagination(paginationInput, {
      page: EVENTS_CONSTANTS.DEFAULT_PAGE,
      limit: EVENTS_CONSTANTS.DEFAULT_LIMIT,
      maxLimit: EVENTS_CONSTANTS.MAX_LIMIT,
    });

    const where = await this.buildPublicWhere(query);
    const orderBy = this.buildOrderBy(query);

    const [events, total] = await Promise.all([
      eventsRepository.listPublicEvents(where, skip, limit, orderBy),
      eventsRepository.countPublicEvents(where),
    ]);

    return {
      items: await Promise.all(events.map((e) => this.buildListItem(e))),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  private async buildPublicWhere(query: PublicEventsQuery): Promise<Prisma.EventWhereInput> {
    const where: Prisma.EventWhereInput = {
      status: { in: [...EVENTS_CONSTANTS.PUBLIC_STATUSES] },
      visibility: 'PUBLIC',
      host: { accountStatus: 'VERIFIED', deletedAt: null },
    };

    if (query.city) {
      where.location = { city: { equals: query.city, mode: 'insensitive' } };
    }
    if (query.category) {
      where.category = { slug: query.category };
    }
    if (query.priceType === 'free') where.price = 0;
    if (query.priceType === 'paid') where.price = { gt: 0 };
    if (query.verifiedHost) {
      where.host = { accountStatus: 'VERIFIED', deletedAt: null };
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.date === 'upcoming' || !query.date) {
      where.eventStart = { gte: new Date() };
    } else if (query.date === 'past') {
      where.eventEnd = { lt: new Date() };
    }

    return where;
  }

  private buildOrderBy(query: PublicEventsQuery): Prisma.EventOrderByWithRelationInput {
    switch (query.sort) {
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'trending':
        return { isTrending: 'desc' };
      default:
        return { eventStart: 'asc' };
    }
  }

  private validateImage(file: UploadedEventFile) {
    if (file.size > EVENTS_CONSTANTS.MAX_UPLOAD_BYTES) {
      throw new ValidationError('File exceeds maximum size of 10MB.');
    }
    if (
      !EVENTS_CONSTANTS.ALLOWED_IMAGE_MIMES.includes(
        file.mimetype as (typeof EVENTS_CONSTANTS.ALLOWED_IMAGE_MIMES)[number],
      )
    ) {
      throw new ValidationError('Invalid image type.');
    }
    validateImageDimensions(file.buffer, {
      minWidth: 400,
      minHeight: 300,
      maxWidth: 8000,
      maxHeight: 8000,
    });
  }

  private async audit(
    userId: string | undefined,
    action: string,
    entityId: string,
    changes: Record<string, unknown>,
    meta?: AuditMeta,
  ) {
    await eventsRepository.createAuditLog({
      ...(userId !== undefined && { userId }),
      action,
      entityId,
      changes,
      ...(meta?.ip !== undefined && { ip: meta.ip }),
      ...(meta?.browser !== undefined && { browser: meta.browser }),
    });
  }

  private async invalidateCache(slug: string) {
    try {
      const redis = getRedisClient();
      await redis.del(EVENTS_CONSTANTS.REDIS_KEYS.details(slug));
    } catch {
      // optional
    }
  }

  private async invalidateAllListCaches() {
    try {
      const redis = getRedisClient();
      await redis.del(
        EVENTS_CONSTANTS.REDIS_KEYS.featured,
        EVENTS_CONSTANTS.REDIS_KEYS.trending,
      );
    } catch {
      // optional
    }
  }

  private async cacheDetail(slug: string, data: unknown) {
    try {
      const redis = getRedisClient();
      await redis.setex(
        EVENTS_CONSTANTS.REDIS_KEYS.details(slug),
        EVENTS_CONSTANTS.CACHE_TTL_SECONDS,
        JSON.stringify(data),
      );
    } catch {
      // optional
    }
  }

  private async getCachedDetail(slug: string) {
    try {
      const redis = getRedisClient();
      const raw = await redis.get(EVENTS_CONSTANTS.REDIS_KEYS.details(slug));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private async cacheList(key: string, data: unknown) {
    try {
      const redis = getRedisClient();
      await redis.setex(key, EVENTS_CONSTANTS.CACHE_TTL_SECONDS, JSON.stringify(data));
    } catch {
      // optional
    }
  }

  private async getCachedList(key: string) {
    try {
      const redis = getRedisClient();
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

export const eventsService = new EventsService();

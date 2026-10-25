import type {
  EventCategoryView,
  EventHostView,
  EventListItemView,
  EventLocationView,
  EventMediaView,
  EventPrivateView,
  EventPublicView,
  EventRuleView,
  EventTagView,
} from '../types/events.types.js';
import type { Category, Event, EventLocation, EventMedia, EventRule, EventStatus, HostProfile } from '@prisma/client';

type EventWithRelations = Event & {
  category: Category;
  host: HostProfile;
  location: EventLocation | null;
  media: EventMedia[];
  rules: EventRule[];
  tagMappings: Array<{ tag: { id: string; name: string; slug: string } }>;
};

type EventBookingFields = Pick<
  Event,
  'id' | 'hostId' | 'status' | 'capacity' | 'remainingCapacity' | 'bookingStart' | 'bookingEnd' | 'isSuspended'
>;

const BOOKABLE_STATUSES: EventStatus[] = ['PUBLISHED', 'BOOKING_OPEN'];

export function computeEventBookingMeta(event: EventBookingFields) {
  const now = new Date();
  const inBookingWindow = now >= event.bookingStart && now <= event.bookingEnd;
  const bookingRequired =
    BOOKABLE_STATUSES.includes(event.status) &&
    !event.isSuspended &&
    inBookingWindow &&
    event.remainingCapacity > 0;

  return {
    bookingRequired,
    availability: {
      capacity: event.capacity,
      remaining: event.remainingCapacity,
      isOpen: bookingRequired,
    },
  };
}

export function toPublicEventIdentifiers(event: EventBookingFields) {
  const meta = computeEventBookingMeta(event);
  return {
    id: event.id,
    eventId: event.id,
    hostId: event.hostId,
    bookingRequired: meta.bookingRequired,
    capacity: event.capacity,
    availability: meta.availability,
  };
}

export function toAmenities(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((v): v is string => typeof v === 'string');
}

export function toCategoryDto(category: Category): EventCategoryView {
  return { id: category.id, name: category.name, slug: category.slug };
}

export function toHostDto(
  host: HostProfile,
  profileImageUrl?: string | null,
): EventHostView {
  return {
    slug: host.slug,
    displayName: host.displayName,
    profileImageUrl: profileImageUrl ?? null,
    isVerified: host.accountStatus === 'VERIFIED',
    hostRating: Number(host.hostRating),
  };
}

export function toLocationDto(location: EventLocation): EventLocationView {
  return {
    venueName: location.venueName,
    addressLine1: location.addressLine1,
    ...(location.addressLine2 && { addressLine2: location.addressLine2 }),
    city: location.city,
    state: location.state,
    country: location.country,
    postalCode: location.postalCode,
    latitude: location.latitude ? Number(location.latitude) : null,
    longitude: location.longitude ? Number(location.longitude) : null,
    ...(location.googlePlaceId && { googlePlaceId: location.googlePlaceId }),
    ...(location.mapUrl && { mapUrl: location.mapUrl }),
    isPrivateAddress: location.isPrivateAddress,
  };
}

export function toRuleDto(rule: EventRule): EventRuleView {
  return {
    id: rule.id,
    title: rule.title,
    description: rule.description,
    displayOrder: rule.displayOrder,
  };
}

export function toTagDto(tag: { id: string; name: string; slug: string }): EventTagView {
  return { id: tag.id, name: tag.name, slug: tag.slug };
}

export function toMediaDto(media: EventMedia, url: string, thumbnailUrl?: string | null): EventMediaView {
  return {
    id: media.id,
    mediaType: media.mediaType,
    url,
    thumbnailUrl: thumbnailUrl ?? null,
    sortOrder: media.sortOrder,
    isCover: media.isCover,
  };
}

export function toPublicEventDto(
  event: EventWithRelations,
  options: {
    media: EventMediaView[];
    hostProfileImageUrl?: string | null;
    includePrivateLocation?: boolean;
  },
): EventPublicView {
  const location =
    event.location && (options.includePrivateLocation || !event.location.isPrivateAddress)
      ? toLocationDto(event.location)
      : event.location
        ? {
            venueName: event.location.venueName,
            addressLine1: event.location.city,
            city: event.location.city,
            state: event.location.state,
            country: event.location.country,
            postalCode: event.location.postalCode,
            latitude: event.location.latitude ? Number(event.location.latitude) : null,
            longitude: event.location.longitude ? Number(event.location.longitude) : null,
            isPrivateAddress: true,
          }
        : null;

  return {
    ...toPublicEventIdentifiers(event),
    slug: event.slug,
    title: event.title,
    description: event.description,
    shortDescription: event.shortDescription,
    status: event.status,
    visibility: event.visibility,
    approvalRequired: event.approvalRequired,
    minimumAge: event.minimumAge,
    maximumAge: event.maximumAge,
    language: event.language,
    remainingCapacity: event.remainingCapacity,
    price: Number(event.price),
    currency: event.currency,
    bookingStart: event.bookingStart,
    bookingEnd: event.bookingEnd,
    eventStart: event.eventStart,
    eventEnd: event.eventEnd,
    dressCode: event.dressCode,
    foodProvided: event.foodProvided,
    parkingAvailable: event.parkingAvailable,
    petsAllowed: event.petsAllowed,
    smokingAllowed: event.smokingAllowed,
    amenities: toAmenities(event.amenitiesJson),
    timezone: event.timezone,
    isFeatured: event.isFeatured,
    isTrending: event.isTrending,
    category: toCategoryDto(event.category),
    host: toHostDto(event.host, options.hostProfileImageUrl),
    location,
    media: options.media,
    rules: event.rules.map(toRuleDto),
    tags: event.tagMappings.map((m) => toTagDto(m.tag)),
  };
}

export function toPrivateEventDto(
  event: EventWithRelations,
  options: {
    media: EventMediaView[];
    hostProfileImageUrl?: string | null;
  },
): EventPrivateView {
  return {
    ...toPublicEventDto(event, { ...options, includePrivateLocation: true }),
    id: event.id,
    hostId: event.hostId,
    categoryId: event.categoryId,
    cancelReason: event.cancelReason,
    rejectionReason: event.rejectionReason,
    isSuspended: event.isSuspended,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

export function toListItemDto(
  event: EventWithRelations,
  coverImageUrl: string | null,
): EventListItemView {
  return {
    ...toPublicEventIdentifiers(event),
    slug: event.slug,
    title: event.title,
    shortDescription: event.shortDescription,
    status: event.status,
    price: Number(event.price),
    currency: event.currency,
    eventStart: event.eventStart,
    eventEnd: event.eventEnd,
    city: event.location?.city ?? null,
    coverImageUrl,
    isFeatured: event.isFeatured,
    isTrending: event.isTrending,
    host: {
      slug: event.host.slug,
      displayName: event.host.displayName,
      isVerified: event.host.accountStatus === 'VERIFIED',
    },
    category: { name: event.category.name, slug: event.category.slug },
  };
}

import type { EventStatus, EventVisibility } from '@prisma/client';

export interface EventLocationInput {
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
}

export interface EventRuleInput {
  title: string;
  description?: string;
  displayOrder?: number;
}

export interface EventLocationView {
  venueName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId?: string;
  mapUrl?: string;
  isPrivateAddress?: boolean;
}

export interface EventHostView {
  slug: string;
  displayName: string;
  profileImageUrl: string | null;
  isVerified: boolean;
  hostRating: number;
}

export interface EventCategoryView {
  id: string;
  name: string;
  slug: string;
}

export interface EventMediaView {
  id: string;
  mediaType: string;
  url: string;
  thumbnailUrl: string | null;
  sortOrder: number;
  isCover: boolean;
}

export interface EventRuleView {
  id: string;
  title: string;
  description: string | null;
  displayOrder: number;
}

export interface EventTagView {
  id: string;
  name: string;
  slug: string;
}

export interface EventAvailabilityView {
  capacity: number;
  remaining: number;
  isOpen: boolean;
}

export interface EventPublicView {
  id: string;
  eventId: string;
  slug: string;
  hostId: string;
  bookingRequired: boolean;
  capacity: number;
  availability: EventAvailabilityView;
  title: string;
  description: string;
  shortDescription: string | null;
  status: EventStatus;
  visibility: EventVisibility;
  approvalRequired: boolean;
  minimumAge: number | null;
  maximumAge: number | null;
  language: string | null;
  remainingCapacity: number;
  price: number;
  currency: string;
  bookingStart: Date;
  bookingEnd: Date;
  eventStart: Date;
  eventEnd: Date;
  dressCode: string | null;
  foodProvided: boolean;
  parkingAvailable: boolean;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  amenities: string[];
  timezone: string;
  isFeatured: boolean;
  isTrending: boolean;
  category: EventCategoryView;
  host: EventHostView;
  location: EventLocationView | null;
  media: EventMediaView[];
  rules: EventRuleView[];
  tags: EventTagView[];
}

export interface EventPrivateView extends EventPublicView {
  id: string;
  hostId: string;
  categoryId: string;
  cancelReason: string | null;
  rejectionReason: string | null;
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventListItemView {
  id: string;
  eventId: string;
  slug: string;
  hostId: string;
  bookingRequired: boolean;
  capacity: number;
  availability: EventAvailabilityView;
  title: string;
  shortDescription: string | null;
  status: EventStatus;
  price: number;
  currency: string;
  eventStart: Date;
  eventEnd: Date;
  city: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  isTrending: boolean;
  host: Pick<EventHostView, 'slug' | 'displayName' | 'isVerified'>;
  category: Pick<EventCategoryView, 'name' | 'slug'>;
}

export interface EventAnalyticsPlaceholder {
  views: number;
  bookings: number;
  attendance: number;
  shares: number;
  reviews: number;
  revenuePlaceholder: number;
  conversionRatePlaceholder: number;
}

export interface EventSearchFilters {
  keyword?: string;
  city?: string;
  category?: string;
  categoryId?: string;
  tags?: string[];
  hostId?: string;
  minPrice?: number;
  maxPrice?: number;
  priceType?: 'free' | 'paid';
  date?: string;
  verifiedHost?: boolean;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  sort?: 'newest' | 'nearest' | 'trending' | 'rating' | 'price_asc' | 'price_desc';
  status?: 'upcoming' | 'past';
}

export interface UploadedEventFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

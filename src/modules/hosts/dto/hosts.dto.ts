import type {
  HostActivityView,
  HostBadgeView,
  HostDashboardView,
  HostPreferencesView,
  HostPrivateProfileView,
  HostProfileCompletionView,
  HostPublicProfileView,
  HostStatisticsView,
} from '../types/hosts.types.js';
import type { HostProfile, HostAddress, HostBadge, HostActivity, HostAnalytics, VerificationStatus } from '@prisma/client';

type HostWithRelations = HostProfile & {
  addresses: HostAddress[];
  badges: HostBadge[];
  analytics: HostAnalytics | null;
};

export function toPreferencesDto(json: unknown): HostPreferencesView {
  const defaults: HostPreferencesView = {
    notifyBookings: true,
    notifyReviews: true,
    autoApproveBookings: false,
    publicProfile: true,
    showEmail: false,
    showPhone: false,
  };
  if (!json || typeof json !== 'object') return defaults;
  return { ...defaults, ...(json as Partial<HostPreferencesView>) };
}

export function toBadgeDto(badge: HostBadge): HostBadgeView {
  return { badgeType: badge.badgeType, awardedAt: badge.awardedAt };
}

export function toActivityDto(activity: HostActivity): HostActivityView {
  return {
    id: activity.id,
    activityType: activity.activityType,
    metadata: (activity.metadataJson as Record<string, unknown> | null) ?? null,
    createdAt: activity.createdAt,
  };
}

export function toStatisticsDto(
  host: HostProfile,
  analytics: HostAnalytics | null,
): HostStatisticsView {
  return {
    totalEvents: host.totalEvents,
    upcomingEvents: analytics?.upcomingEvents ?? 0,
    completedEvents: host.completedEvents,
    followers: host.followersCount,
    averageRating: Number(host.hostRating),
    responseRate: Number(host.responseRate),
    responseTime: host.responseTime,
    totalReviews: host.totalReviews,
    totalGuests: host.totalGuests,
    revenuePlaceholder: Number(analytics?.earnings ?? 0),
  };
}

export function toPublicProfileDto(
  host: HostWithRelations,
  options: {
    profileImageUrl?: string | null;
    coverImageUrl?: string | null;
    galleryUrls?: string[];
    trustScore?: number | null;
  },
): HostPublicProfileView {
  return {
    slug: host.slug,
    displayName: host.displayName,
    bio: host.bio,
    about: host.about,
    occupation: host.occupation,
    languages: host.languages,
    interests: host.interests,
    profileImageUrl: options.profileImageUrl ?? null,
    coverImageUrl: options.coverImageUrl ?? null,
    hostRating: Number(host.hostRating),
    totalReviews: host.totalReviews,
    completedEvents: host.completedEvents,
    responseTime: host.responseTime,
    badges: host.badges.map(toBadgeDto),
    socialLinks: {
      instagram: host.instagram,
      linkedin: host.linkedin,
      twitter: host.twitter,
      website: host.website,
    },
    isVerified: host.accountStatus === 'VERIFIED',
    galleryUrls: options.galleryUrls ?? [],
    trustScore: options.trustScore ?? null,
  };
}

export function toPrivateProfileDto(
  host: HostWithRelations,
  options: {
    profileImageUrl?: string | null;
    coverImageUrl?: string | null;
    galleryUrls?: string[];
    trustScore?: number | null;
    profileCompletion: number;
    verificationStatus?: VerificationStatus;
  },
): HostPrivateProfileView {
  const address = host.addresses[0];
  return {
    ...toPublicProfileDto(host, options),
    id: host.id,
    userId: host.userId,
    accountStatus: host.accountStatus,
    verificationStatus: options.verificationStatus ?? host.verificationStatus,
    hostingExperience: host.hostingExperience,
    emergencyContact:
      host.emergencyContactName && host.emergencyContactPhone
        ? { name: host.emergencyContactName, phone: host.emergencyContactPhone }
        : null,
    address: address
      ? {
          addressLine1: address.addressLine1,
          ...(address.addressLine2 && { addressLine2: address.addressLine2 }),
          ...(address.landmark && { landmark: address.landmark }),
          city: address.city,
          state: address.state,
          country: address.country,
          postalCode: address.postalCode,
          ...(address.latitude && { latitude: Number(address.latitude) }),
          ...(address.longitude && { longitude: Number(address.longitude) }),
        }
      : null,
    preferences: toPreferencesDto(host.preferencesJson),
    availability: Array.isArray(host.availabilityJson)
      ? (host.availabilityJson as unknown as HostPrivateProfileView['availability'])
      : [],
    profileCompletion: options.profileCompletion,
    hostSince: host.hostSince,
    organizationId: host.organizationId,
  };
}

export function toProfileCompletionDto(
  percentage: number,
  completed: string[],
  missing: string[],
): HostProfileCompletionView {
  return { percentage, completed, missing };
}

export function toDashboardDto(data: HostDashboardView): HostDashboardView {
  return data;
}

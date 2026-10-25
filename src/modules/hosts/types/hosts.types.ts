import type { HostAccountStatus, HostBadgeType, VerificationStatus } from '@prisma/client';

export interface HostAddressInput {
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
}

export interface EmergencyContactInput {
  name: string;
  phone: string;
}

export interface HostPreferencesView {
  notifyBookings: boolean;
  notifyReviews: boolean;
  autoApproveBookings: boolean;
  publicProfile: boolean;
  showEmail: boolean;
  showPhone: boolean;
}

export interface HostAvailabilitySlot {
  day: string;
  startTime: string;
  endTime: string;
}

export interface HostSocialLinksView {
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  website: string | null;
}

export interface HostBadgeView {
  badgeType: HostBadgeType;
  awardedAt: Date;
}

export interface HostStatisticsView {
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  followers: number;
  averageRating: number;
  responseRate: number;
  responseTime: number | null;
  totalReviews: number;
  totalGuests: number;
  revenuePlaceholder: number;
}

export interface HostPublicProfileView {
  slug: string;
  displayName: string;
  bio: string | null;
  about: string | null;
  occupation: string | null;
  languages: string[];
  interests: string[];
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  hostRating: number;
  totalReviews: number;
  completedEvents: number;
  responseTime: number | null;
  badges: HostBadgeView[];
  socialLinks: HostSocialLinksView;
  isVerified: boolean;
  galleryUrls: string[];
  trustScore: number | null;
}

export interface HostPrivateProfileView extends HostPublicProfileView {
  id: string;
  userId: string;
  accountStatus: HostAccountStatus;
  verificationStatus: VerificationStatus;
  hostingExperience: string | null;
  emergencyContact: EmergencyContactInput | null;
  address: HostAddressInput | null;
  preferences: HostPreferencesView;
  availability: HostAvailabilitySlot[];
  profileCompletion: number;
  hostSince: Date | null;
  organizationId: string | null;
}

export interface HostDashboardView {
  statistics: HostStatisticsView;
  profileCompletion: number;
  verificationStatus: VerificationStatus;
  accountStatus: HostAccountStatus;
  pendingTasks: string[];
  recentActivity: HostActivityView[];
  upcomingEventsPlaceholder: number;
}

export interface HostActivityView {
  id: string;
  activityType: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface HostProfileCompletionView {
  percentage: number;
  completed: string[];
  missing: string[];
}

export interface HostSearchFilters {
  city?: string;
  minRating?: number;
  verified?: boolean;
  language?: string;
  category?: string;
}

export interface UploadedHostFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

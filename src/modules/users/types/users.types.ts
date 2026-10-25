import type {
  ActivityVisibility,
  AuthProvider,
  Gender,
  ProfileVisibility,
  TrustLevel,
} from '@prisma/client';

export interface FullUserProfile {
  id: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  provider: AuthProvider;
  roles: string[];
  profile: {
    firstName: string;
    lastName: string;
    username: string;
    bio: string | null;
    gender: Gender | null;
    dob: Date | null;
    profileImage: string | null;
    coverImage: string | null;
    occupation: string | null;
    company: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    trustScore: number;
    followersCount: number;
    followingCount: number;
    eventsJoined: number;
    eventsHosted: number;
    averageRating: number;
  } | null;
  interests: string[];
  socialLinks: {
    instagram: string | null;
    linkedin: string | null;
    twitter: string | null;
    github: string | null;
    website: string | null;
  } | null;
}

export interface PublicProfileView {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  profileImage: string | null;
  coverImage: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  trustScore: number | null;
  followersCount: number;
  followingCount: number;
  eventsJoined: number;
  eventsHosted: number;
  averageRating: number;
  interests: string[];
  isFollowing?: boolean;
}

export interface PrivacySettingsView {
  profileVisibility: ProfileVisibility;
  activityVisibility: ActivityVisibility;
  showEmail: boolean;
  showPhone: boolean;
  showLastSeen: boolean;
  allowFollowRequests: boolean;
  showTrustScore: boolean;
  showActivityFeed: boolean;
}

export interface AccountSettingsView {
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  twoFactorEnabled: boolean;
  marketingOptIn: boolean;
}

export interface NotificationSettingsView {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  security: boolean;
  booking: boolean;
  review: boolean;
}

export interface TrustScoreView {
  score: number;
  level: TrustLevel;
  verifiedIdentity: boolean;
  completedEvents: number;
  positiveReviews: number;
  negativeReports: number;
  lastUpdated: Date;
}

export interface TrustFactorView {
  name: string;
  value: string | number | boolean;
  impact: 'positive' | 'neutral' | 'negative';
}

export interface ActivityItemView {
  id: string;
  activityType: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface SavedEventView {
  id: string;
  eventId: string;
  title: string;
  slug: string;
  eventStart: Date;
  savedAt: Date;
}

export interface FollowUserView {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  followedAt: Date;
}

export interface ConnectedAccountView {
  id: string;
  provider: AuthProvider;
  email: string | null;
  connectedAt: Date;
}

export interface DeviceSessionView {
  id: string;
  deviceId: string;
  deviceName: string | null;
  platform: string;
  isTrusted: boolean;
  lastLogin: Date | null;
  createdAt: Date;
}

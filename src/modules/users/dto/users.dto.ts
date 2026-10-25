import type {
  AccountSettingsView,
  ActivityItemView,
  ConnectedAccountView,
  DeviceSessionView,
  FollowUserView,
  FullUserProfile,
  NotificationSettingsView,
  PrivacySettingsView,
  PublicProfileView,
  SavedEventView,
  TrustFactorView,
  TrustScoreView,
} from '../types/users.types.js';
import type { Prisma } from '@prisma/client';

type UserWithProfile = Prisma.UserGetPayload<{
  include: {
    profile: true;
    interests: true;
    socialLinks: true;
    userRoles: { include: { role: true } };
  };
}>;

export function toFullUserProfile(user: UserWithProfile): FullUserProfile {
  const roles = user.userRoles.map((ur) => ur.role.name);
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    provider: user.provider,
    roles,
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          username: user.profile.username,
          bio: user.profile.bio,
          gender: user.profile.gender,
          dob: user.profile.dob,
          profileImage: user.profile.profileImage,
          coverImage: user.profile.coverImage,
          occupation: user.profile.occupation,
          company: user.profile.company,
          city: user.profile.city,
          state: user.profile.state,
          country: user.profile.country,
          trustScore: user.profile.trustScore,
          followersCount: user.profile.followersCount,
          followingCount: user.profile.followingCount,
          eventsJoined: user.profile.eventsJoined,
          eventsHosted: user.profile.eventsHosted,
          averageRating: Number(user.profile.averageRating),
        }
      : null,
    interests: user.interests.map((i) => i.interest),
    socialLinks: user.socialLinks
      ? {
          instagram: user.socialLinks.instagram,
          linkedin: user.socialLinks.linkedin,
          twitter: user.socialLinks.twitter,
          github: user.socialLinks.github,
          website: user.socialLinks.website,
        }
      : null,
  };
}

type AdminUserRecord = {
  id: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  accountStatus: string;
  provider: string;
  lastLogin: Date | null;
  createdAt: Date;
  isDeleted: boolean;
  profile: {
    firstName: string;
    lastName: string;
    username: string;
    city: string | null;
    profileImage: string | null;
    trustScore: number | null;
  } | null;
  userRoles: Array<{ role: { name: string } }>;
};

export function toAdminUserDto(user: AdminUserRecord) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    accountStatus: user.accountStatus,
    provider: user.provider,
    roles: user.userRoles.map((ur) => ur.role.name),
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          username: user.profile.username,
          city: user.profile.city,
          profileImage: user.profile.profileImage,
          trustScore: user.profile.trustScore,
        }
      : null,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    isDeleted: user.isDeleted,
  };
}

export function toPublicProfileView(
  user: UserWithProfile,
  options?: { isFollowing?: boolean; hideTrustScore?: boolean },
): PublicProfileView {
  const profile = user.profile!;
  return {
    id: user.id,
    username: profile.username,
    firstName: profile.firstName,
    lastName: profile.lastName,
    bio: profile.bio,
    profileImage: profile.profileImage,
    coverImage: profile.coverImage,
    city: profile.city,
    state: profile.state,
    country: profile.country,
    trustScore: options?.hideTrustScore ? null : profile.trustScore,
    followersCount: profile.followersCount,
    followingCount: profile.followingCount,
    eventsJoined: profile.eventsJoined,
    eventsHosted: profile.eventsHosted,
    averageRating: Number(profile.averageRating),
    interests: user.interests.map((i) => i.interest),
    ...(options?.isFollowing !== undefined && { isFollowing: options.isFollowing }),
  };
}

export function toPrivacySettingsDto(settings: PrivacySettingsView): PrivacySettingsView {
  return settings;
}

export function toAccountSettingsDto(settings: AccountSettingsView): AccountSettingsView {
  return settings;
}

export function toNotificationSettingsDto(
  settings: NotificationSettingsView,
): NotificationSettingsView {
  return settings;
}

export function toTrustScoreDto(score: TrustScoreView): TrustScoreView {
  return score;
}

export function toTrustFactorsDto(factors: TrustFactorView[]): TrustFactorView[] {
  return factors;
}

export function toActivityItemDto(item: ActivityItemView): ActivityItemView {
  return item;
}

export function toSavedEventDto(item: SavedEventView): SavedEventView {
  return item;
}

export function toFollowUserDto(item: FollowUserView): FollowUserView {
  return item;
}

export function toConnectedAccountDto(item: ConnectedAccountView): ConnectedAccountView {
  return item;
}

export function toDeviceSessionDto(item: DeviceSessionView): DeviceSessionView {
  return item;
}

import type { AccountStatus, AuthProvider, DevicePlatform } from '@prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface DeviceContext {
  deviceType: DevicePlatform;
  deviceId?: string;
  deviceName?: string;
  browser?: string;
  operatingSystem?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  accountStatus: AccountStatus;
  provider: AuthProvider;
  roles: string[];
  permissions: string[];
  sessionId: string;
}

export interface PublicUserResponse {
  id: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  accountStatus: AccountStatus;
  provider: AuthProvider;
  roles: string[];
  profile: {
    firstName: string;
    lastName: string;
    username: string;
    profileImage: string | null;
    city: string | null;
    trustScore: number;
  } | null;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  roles: string[];
  sessionId: string;
  type: 'access';
  jti: string;
}

export interface JwtRefreshPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
  jti: string;
}

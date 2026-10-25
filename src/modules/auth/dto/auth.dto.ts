import type { PublicUserResponse, TokenPair } from '../types/auth.types.js';

export interface RegisterResponseDto {
  message: string;
}

export interface AuthTokensResponseDto {
  accessToken: string;
  refreshToken: string;
  user: PublicUserResponse;
}

export interface RefreshTokenResponseDto {
  accessToken: string;
  refreshToken: string;
}

export interface MessageResponseDto {
  message: string;
}

export interface SessionResponseDto {
  id: string;
  deviceType: string;
  deviceName: string | null;
  browser: string | null;
  ipAddress: string | null;
  lastActive: string;
  expiresAt: string;
  isCurrent: boolean;
}

export function toAuthTokensResponseDto(
  tokens: TokenPair,
  user: PublicUserResponse,
): AuthTokensResponseDto {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user,
  };
}

export function toRefreshTokenResponseDto(tokens: {
  accessToken: string;
  refreshToken: string;
}): RefreshTokenResponseDto {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export function toSessionResponseDto(
  session: {
    id: string;
    deviceType: string;
    deviceName: string | null;
    browser: string | null;
    ipAddress: string | null;
    lastActive: Date;
    expiresAt: Date;
  },
  currentSessionId?: string,
): SessionResponseDto {
  return {
    id: session.id,
    deviceType: session.deviceType,
    deviceName: session.deviceName,
    browser: session.browser,
    ipAddress: session.ipAddress,
    lastActive: session.lastActive.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    isCurrent: currentSessionId === session.id,
  };
}

import { createHash } from 'node:crypto';
import { getRedisClient } from '@redis/index.js';
import { AUTH_CONSTANTS, REDIS_KEYS } from '../../modules/auth/constants/auth.constants.js';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function storeOtp(
  key: string,
  otp: string,
  expirySeconds = AUTH_CONSTANTS.OTP_EXPIRY_SECONDS,
): Promise<void> {
  const redis = getRedisClient();
  await redis.setex(key, expirySeconds, otp);
  await redis.del(REDIS_KEYS.otpAttempts(key));
}

export async function verifyOtp(key: string, otp: string): Promise<boolean> {
  const redis = getRedisClient();
  const attemptsKey = REDIS_KEYS.otpAttempts(key);
  const attempts = Number((await redis.get(attemptsKey)) ?? '0');

  if (attempts >= AUTH_CONSTANTS.OTP_MAX_ATTEMPTS) {
    return false;
  }

  const stored = await redis.get(key);
  if (!stored || stored !== otp) {
    await redis.incr(attemptsKey);
    await redis.expire(attemptsKey, AUTH_CONSTANTS.OTP_EXPIRY_SECONDS);
    return false;
  }

  await redis.del(key);
  await redis.del(attemptsKey);
  return true;
}

export async function blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient();
  if (ttlSeconds > 0) {
    await redis.setex(REDIS_KEYS.tokenBlacklist(jti), ttlSeconds, '1');
  }
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const redis = getRedisClient();
  const result = await redis.get(REDIS_KEYS.tokenBlacklist(jti));
  return result === '1';
}

export async function incrementFailedLogin(identifier: string): Promise<number> {
  const redis = getRedisClient();
  const key = REDIS_KEYS.failedLogin(identifier);
  const count = await redis.incr(key);
  await redis.expire(key, AUTH_CONSTANTS.ACCOUNT_LOCK_DURATION_SECONDS);
  return count;
}

export async function resetFailedLogin(identifier: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(REDIS_KEYS.failedLogin(identifier));
  await redis.del(REDIS_KEYS.accountLock(identifier));
}

export async function lockAccount(identifier: string): Promise<void> {
  const redis = getRedisClient();
  await redis.setex(
    REDIS_KEYS.accountLock(identifier),
    AUTH_CONSTANTS.ACCOUNT_LOCK_DURATION_SECONDS,
    '1',
  );
}

export async function isAccountLocked(identifier: string): Promise<boolean> {
  const redis = getRedisClient();
  const locked = await redis.get(REDIS_KEYS.accountLock(identifier));
  return locked === '1';
}

export async function storePasswordResetToken(
  userId: string,
  token: string,
  expirySeconds = AUTH_CONSTANTS.PASSWORD_RESET_EXPIRY_SECONDS,
): Promise<void> {
  const redis = getRedisClient();
  await redis.setex(REDIS_KEYS.passwordReset(token), expirySeconds, userId);
}

export async function getPasswordResetUserId(token: string): Promise<string | null> {
  const redis = getRedisClient();
  return redis.get(REDIS_KEYS.passwordReset(token));
}

export async function deletePasswordResetToken(token: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(REDIS_KEYS.passwordReset(token));
}

export async function cacheSession(sessionId: string, userId: string, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient();
  await redis.setex(REDIS_KEYS.refreshSession(sessionId), ttlSeconds, userId);
}

export async function deleteCachedSession(sessionId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(REDIS_KEYS.refreshSession(sessionId));
}

export async function checkEmailResendCooldown(userId: string): Promise<boolean> {
  const redis = getRedisClient();
  const key = REDIS_KEYS.emailResendCooldown(userId);
  const exists = await redis.get(key);
  return exists === '1';
}

export async function setEmailResendCooldown(
  userId: string,
  seconds = 60,
): Promise<void> {
  const redis = getRedisClient();
  await redis.setex(REDIS_KEYS.emailResendCooldown(userId), seconds, '1');
}

import jwt from 'jsonwebtoken';
import { AccountStatus } from '@prisma/client';
import {
  ConflictError,
  ForbiddenError,
  InvalidCredentialsError,
  AccountLockedError,
  TokenInvalidError,
  ValidationError,
  NotFoundError,
} from '@errors/index.js';
import { jwtProvider } from '../../../providers/jwt/jwt.provider.js';
import {
  storeOtp,
  verifyOtp,
  blacklistToken,
  incrementFailedLogin,
  resetFailedLogin,
  lockAccount,
  isAccountLocked,
  storePasswordResetToken,
  getPasswordResetUserId,
  deletePasswordResetToken,
  cacheSession,
  deleteCachedSession,
  checkEmailResendCooldown,
  setEmailResendCooldown,
} from '../../../providers/redis/auth.redis.js';
import { emailService } from '../../../services/email.service.js';
import { smsService } from '../../../services/sms.service.js';
import { getLogger } from '@logger/index.js';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../../../utils/password.util.js';
import { normalizeEmail, normalizePhone, sanitizeString } from '../../../utils/sanitize.util.js';
import { generateOtp, generateSecureToken } from '../../../utils/otp.util.js';
import {
  AUTH_CONSTANTS,
  DISPOSABLE_EMAIL_DOMAINS,
  REDIS_KEYS,
} from '../constants/auth.constants.js';
import {
  authRepository,
  extractRolesAndPermissions,
  type UserWithAuth,
} from '../repository/auth.repository.js';
import type {
  DeviceContext,
  PublicUserResponse,
  TokenPair,
} from '../types/auth.types.js';
import { toSessionResponseDto } from '../dto/auth.dto.js';
import type {
  RegisterInput,
  LoginInput,
  LoginPhoneInput,
  RefreshTokenInput,
} from '../schemas/auth.schema.js';

export class AuthService {
  async register(input: RegisterInput): Promise<{ message: string }> {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    const firstName = sanitizeString(input.firstName);
    const lastName = sanitizeString(input.lastName);

    this.validateEmailDomain(email);
    validatePasswordStrength(input.password);

    if (await authRepository.emailExists(email)) {
      throw new ConflictError('Email is already registered.', { field: 'email' });
    }
    if (await authRepository.phoneExists(phone)) {
      throw new ConflictError('Phone number is already registered.', { field: 'phone' });
    }

    const username = await this.generateUniqueUsername(firstName, lastName, email);
    const passwordHash = await hashPassword(input.password);

    const user = await authRepository.createUser({
      email,
      phone,
      passwordHash,
      firstName,
      lastName,
      username,
    });

    try {
      await this.sendEmailVerificationInternal(user.id, email);
    } catch (error) {
      // Account is created; email delivery should not block registration.
      getLogger().error({ err: error, userId: user.id }, 'Failed to send registration verification email');
    }

    await authRepository.createAuditLog({
      userId: user.id,
      action: 'REGISTER',
      entity: 'user',
      entityId: user.id,
    });

    return { message: 'Registration successful. Please verify your email.' };
  }

  async login(
    input: LoginInput,
    device: DeviceContext,
    auditMeta?: { ip?: string; browser?: string },
  ): Promise<{ tokens: TokenPair; user: PublicUserResponse }> {
    const email = normalizeEmail(input.email);
    await this.ensureNotLocked(email);

    const user = await authRepository.findByEmail(email);
    if (!user?.passwordHash) {
      await this.handleFailedLogin(email);
      throw new InvalidCredentialsError();
    }

    this.ensureActiveAccount(user);

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      await this.handleFailedLogin(email);
      throw new InvalidCredentialsError();
    }

    await resetFailedLogin(email);
    return this.createAuthSession(user, device, auditMeta, input.rememberMe === true);
  }

  async loginWithPhone(
    input: LoginPhoneInput,
    device: DeviceContext,
    auditMeta?: { ip?: string; browser?: string },
  ): Promise<{ tokens: TokenPair; user: PublicUserResponse }> {
    const phone = normalizePhone(input.phone);
    const otpKey = REDIS_KEYS.otpPhone(phone);

    const valid = await verifyOtp(otpKey, input.otp);
    if (!valid) {
      throw new ValidationError('Invalid or expired OTP.', { field: 'otp' });
    }

    let user = await authRepository.findByPhone(phone);
    if (!user) {
      throw new NotFoundError('No account found for this phone number.');
    }

    this.ensureActiveAccount(user);

    if (!user.phoneVerified) {
      await authRepository.markPhoneVerified(user.id, phone);
      user = (await authRepository.findById(user.id))!;
    }

    return this.createAuthSession(user, device, auditMeta, false);
  }

  async googleLogin(
    _idToken: string,
    _device: DeviceContext,
  ): Promise<{ tokens: TokenPair; user: PublicUserResponse }> {
    throw new ValidationError('Google login is not yet configured.', { field: 'idToken' });
  }

  async refreshToken(
    input: RefreshTokenInput,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload;
    try {
      payload = jwtProvider.verifyRefreshToken(input.refreshToken);
    } catch {
      throw new TokenInvalidError();
    }

    const session = await authRepository.findSessionByRefreshToken(input.refreshToken);
    if (!session || session.id !== payload.sessionId) {
      throw new TokenInvalidError();
    }

    const user = await authRepository.findById(payload.sub);
    if (!user) {
      throw new TokenInvalidError();
    }

    this.ensureActiveAccount(user);

    const { roles } = extractRolesAndPermissions(user);
    const tokens = jwtProvider.createTokenPair(user.id, user.email, roles, session.id);

    await authRepository.updateSessionRefreshToken(
      session.id,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );

    await deleteCachedSession(session.id);
    const ttlSeconds = Math.floor(
      (tokens.refreshTokenExpiresAt.getTime() - Date.now()) / 1000,
    );
    await cacheSession(session.id, user.id, ttlSeconds);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(
    accessToken: string | undefined,
    refreshToken: string | undefined,
    userId?: string,
  ): Promise<void> {
    if (accessToken) {
      try {
        const payload = jwtProvider.verifyAccessToken(accessToken);
        const decoded = jwt.decode(accessToken) as jwt.JwtPayload | null;
        const ttl = decoded?.exp
          ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
          : 0;
        if (payload.jti && ttl > 0) {
          await blacklistToken(payload.jti, ttl);
        }
        if (payload.sessionId) {
          await authRepository.revokeSession(payload.sessionId);
          await deleteCachedSession(payload.sessionId);
        }
      } catch {
        // Token may already be expired — still attempt session revoke via refresh
      }
    }

    if (refreshToken) {
      const session = await authRepository.findSessionByRefreshToken(refreshToken);
      if (session) {
        await authRepository.revokeSession(session.id);
        await deleteCachedSession(session.id);
      }
    }

    if (userId) {
      await authRepository.createAuditLog({
        userId,
        action: 'LOGOUT',
        entity: 'user',
        entityId: userId,
      });
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    const sessionIds = await authRepository.revokeAllUserSessions(userId);
    await Promise.all(sessionIds.map((id) => deleteCachedSession(id)));
    await authRepository.createAuditLog({
      userId,
      action: 'LOGOUT_ALL',
      entity: 'user',
      entityId: userId,
    });
  }

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await authRepository.getUserSessions(userId);
    return sessions.map((s) => toSessionResponseDto(s, currentSessionId));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await authRepository.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundError('Session not found.');
    }
    await authRepository.revokeSession(sessionId);
    await deleteCachedSession(sessionId);
    await authRepository.createAuditLog({
      userId,
      action: 'REVOKE_SESSION',
      entity: 'user_session',
      entityId: sessionId,
    });
  }

  async deleteAccount(userId: string, password: string): Promise<{ message: string }> {
    const user = await authRepository.findById(userId);
    if (!user?.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new InvalidCredentialsError('Password is incorrect.');
    }

    const sessionIds = await authRepository.revokeAllUserSessions(userId);
    await Promise.all(sessionIds.map((id) => deleteCachedSession(id)));
    await authRepository.softDeleteAccount(userId);

    await authRepository.createAuditLog({
      userId,
      action: 'DELETE_ACCOUNT',
      entity: 'user',
      entityId: userId,
    });

    return { message: 'Account deleted successfully.' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalized = normalizeEmail(email);
    const user = await authRepository.findByEmail(normalized);

    if (user) {
      const otp = generateOtp();
      const resetToken = generateSecureToken(AUTH_CONSTANTS.VERIFICATION_TOKEN_BYTES);
      await storeOtp(REDIS_KEYS.otpEmail(normalized), otp);
      await storePasswordResetToken(user.id, resetToken);
      await emailService.sendPasswordReset(normalized, resetToken, otp);
      await authRepository.createAuditLog({
        userId: user.id,
        action: 'FORGOT_PASSWORD',
        entity: 'user',
        entityId: user.id,
      });
    }

    return {
      message: 'If an account exists with this email, a reset OTP has been sent.',
    };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    validatePasswordStrength(password);

    const userId = await getPasswordResetUserId(token);
    if (!userId) {
      throw new TokenInvalidError();
    }

    const passwordHash = await hashPassword(password);
    await authRepository.updatePassword(userId, passwordHash);
    await authRepository.revokeAllUserSessions(userId);
    await deletePasswordResetToken(token);

    await authRepository.createAuditLog({
      userId,
      action: 'RESET_PASSWORD',
      entity: 'user',
      entityId: userId,
    });

    return { message: 'Password reset successful. Please login with your new password.' };
  }

  async sendEmailVerification(userId: string): Promise<{ message: string }> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    if (user.emailVerified) {
      return { message: 'Email is already verified.' };
    }
    if (await checkEmailResendCooldown(userId)) {
      throw new ValidationError('Please wait before requesting another verification email.', {
        field: 'email',
      });
    }
    await this.sendEmailVerificationInternal(user.id, user.email);
    await setEmailResendCooldown(userId);
    return { message: 'Verification email sent.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const verification = await authRepository.findEmailVerificationByToken(token);
    if (!verification) {
      throw new TokenInvalidError();
    }

    await authRepository.markEmailVerified(verification.userId, token);

    await authRepository.createAuditLog({
      userId: verification.userId,
      action: 'VERIFY_EMAIL',
      entity: 'user',
      entityId: verification.userId,
    });

    return { message: 'Email verified successfully.' };
  }

  async sendPhoneOtp(phone: string, userId?: string): Promise<{ message: string }> {
    const normalized = normalizePhone(phone);
    const otp = generateOtp();
    await storeOtp(REDIS_KEYS.otpPhone(normalized), otp);
    await smsService.sendOtp(normalized, otp);

    if (userId) {
      await authRepository.createAuditLog({
        userId,
        action: 'SEND_PHONE_OTP',
        entity: 'user',
        entityId: userId,
      });
    }

    return { message: 'OTP sent to phone number.' };
  }

  async verifyPhoneOtp(userId: string, phone: string, otp: string): Promise<{ message: string }> {
    const normalized = normalizePhone(phone);
    const valid = await verifyOtp(REDIS_KEYS.otpPhone(normalized), otp);
    if (!valid) {
      throw new ValidationError('Invalid or expired OTP.', { field: 'otp' });
    }

    const existing = await authRepository.findByPhone(normalized);
    if (existing && existing.id !== userId) {
      throw new ConflictError('Phone number is already in use.');
    }

    await authRepository.markPhoneVerified(userId, normalized);

    await authRepository.createAuditLog({
      userId,
      action: 'VERIFY_PHONE',
      entity: 'user',
      entityId: userId,
    });

    return { message: 'Phone verified successfully.' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await authRepository.findById(userId);
    if (!user?.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new InvalidCredentialsError('Current password is incorrect.');
    }

    validatePasswordStrength(newPassword);
    const passwordHash = await hashPassword(newPassword);
    await authRepository.updatePassword(userId, passwordHash);
    await authRepository.revokeAllUserSessions(userId);

    await authRepository.createAuditLog({
      userId,
      action: 'CHANGE_PASSWORD',
      entity: 'user',
      entityId: userId,
    });

    return { message: 'Password changed successfully. Please login again.' };
  }

  mapPublicUser(user: UserWithAuth): PublicUserResponse {
    const { roles } = extractRolesAndPermissions(user);
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      accountStatus: user.accountStatus,
      provider: user.provider,
      roles,
      profile: user.profile
        ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            username: user.profile.username,
            profileImage: user.profile.profileImage,
            city: user.profile.city,
            trustScore: user.profile.trustScore,
          }
        : null,
    };
  }

  private async createAuthSession(
    user: UserWithAuth,
    device: DeviceContext,
    auditMeta?: { ip?: string; browser?: string },
    rememberMe = false,
  ): Promise<{ tokens: TokenPair; user: PublicUserResponse }> {
    const { roles } = extractRolesAndPermissions(user);
    const provisionalRefresh = generateSecureToken(AUTH_CONSTANTS.REFRESH_TOKEN_BYTES);
    const refreshMs = rememberMe ? 90 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const refreshExpiresAt = new Date(Date.now() + refreshMs);

    const session = await authRepository.createSession({
      userId: user.id,
      refreshToken: provisionalRefresh,
      deviceType: device.deviceType,
      expiresAt: refreshExpiresAt,
      ...(device.deviceName !== undefined && { deviceName: device.deviceName }),
      ...(device.browser !== undefined && { browser: device.browser }),
      ...(device.operatingSystem !== undefined && { operatingSystem: device.operatingSystem }),
      ...(device.ipAddress !== undefined && { ipAddress: device.ipAddress }),
      ...(device.country !== undefined && { country: device.country }),
      ...(device.city !== undefined && { city: device.city }),
    });

    const tokens = jwtProvider.createTokenPair(user.id, user.email, roles, session.id);

    await authRepository.updateSessionRefreshToken(
      session.id,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );

    const ttlSeconds = Math.floor(
      (tokens.refreshTokenExpiresAt.getTime() - Date.now()) / 1000,
    );
    await cacheSession(session.id, user.id, ttlSeconds);
    await authRepository.updateLastLogin(user.id);

    if (device.deviceId) {
      await authRepository.upsertUserDevice({
        userId: user.id,
        deviceId: device.deviceId,
        platform: device.deviceType,
        ...(device.deviceName !== undefined && { deviceName: device.deviceName }),
      });
    }

    await authRepository.createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entity: 'user',
      entityId: user.id,
      ...(auditMeta?.ip !== undefined && { ip: auditMeta.ip }),
      ...(auditMeta?.browser !== undefined && { browser: auditMeta.browser }),
      device: device.deviceType,
    });

    return { tokens, user: this.mapPublicUser(user) };
  }

  private async sendEmailVerificationInternal(userId: string, email: string): Promise<void> {
    const token = generateSecureToken(AUTH_CONSTANTS.VERIFICATION_TOKEN_BYTES);
    const expiresAt = new Date(
      Date.now() + AUTH_CONSTANTS.EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000,
    );
    await authRepository.createEmailVerification(userId, token, expiresAt);
    await emailService.sendEmailVerification(email, token);
  }

  private async generateUniqueUsername(
    firstName: string,
    lastName: string,
    email: string,
  ): Promise<string> {
    const base = sanitizeString(`${firstName}${lastName}`)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20) || email.split('@')[0]!.replace(/[^a-z0-9]/g, '').slice(0, 20);

    let username = base;
    let counter = 0;
    while (await authRepository.usernameExists(username)) {
      counter += 1;
      username = `${base}${counter}`;
    }
    return username;
  }

  private validateEmailDomain(email: string): void {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      throw new ValidationError('Disposable email addresses are not allowed.', { field: 'email' });
    }
  }

  private ensureActiveAccount(user: UserWithAuth): void {
    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new ForbiddenError('Your account has been suspended.');
    }
    if (user.accountStatus === AccountStatus.DELETED || user.isDeleted) {
      throw new ForbiddenError('Account is not active.');
    }
  }

  private async ensureNotLocked(identifier: string): Promise<void> {
    if (await isAccountLocked(identifier)) {
      throw new AccountLockedError();
    }
  }

  private async handleFailedLogin(identifier: string): Promise<void> {
    const attempts = await incrementFailedLogin(identifier);
    if (attempts >= AUTH_CONSTANTS.ACCOUNT_LOCK_ATTEMPTS) {
      await lockAccount(identifier);
      const user = await authRepository.findByEmail(identifier);
      if (user) {
        await emailService.sendSecurityAlert(
          user.email,
          'Your account has been temporarily locked due to multiple failed login attempts.',
        );
        await authRepository.createAuditLog({
          userId: user.id,
          action: 'ACCOUNT_LOCK',
          entity: 'user',
          entityId: user.id,
        });
      }
      throw new AccountLockedError();
    }
  }
}

export const authService = new AuthService();

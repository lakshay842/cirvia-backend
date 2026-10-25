export const AUTH_CONSTANTS = {
  OTP_LENGTH: 6,
  OTP_EXPIRY_SECONDS: 300,
  OTP_MAX_ATTEMPTS: 5,
  ACCOUNT_LOCK_ATTEMPTS: 5,
  ACCOUNT_LOCK_DURATION_SECONDS: 1800,
  EMAIL_VERIFICATION_EXPIRY_HOURS: 24,
  PASSWORD_RESET_EXPIRY_SECONDS: 900,
  BCRYPT_ROUNDS: 12,
  REFRESH_TOKEN_BYTES: 48,
  VERIFICATION_TOKEN_BYTES: 32,
} as const;

export const REDIS_KEYS = {
  otpPhone: (phone: string) => `auth:otp:phone:${phone}`,
  otpEmail: (email: string) => `auth:otp:email:${email}`,
  otpAttempts: (key: string) => `auth:otp:attempts:${key}`,
  failedLogin: (identifier: string) => `auth:failed:${identifier}`,
  accountLock: (identifier: string) => `auth:lock:${identifier}`,
  tokenBlacklist: (jti: string) => `auth:blacklist:${jti}`,
  passwordReset: (token: string) => `auth:reset:${token}`,
  refreshSession: (sessionId: string) => `auth:session:${sessionId}`,
  emailResendCooldown: (userId: string) => `auth:email:resend:${userId}`,
} as const;

export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  '10minutemail.com',
  'trashmail.com',
]);

export const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'admin123',
  'welcome1',
  'letmein1',
]);

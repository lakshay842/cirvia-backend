import { randomInt, randomBytes } from 'node:crypto';
import { AUTH_CONSTANTS } from '../modules/auth/constants/auth.constants.js';

export function generateOtp(): string {
  const max = 10 ** AUTH_CONSTANTS.OTP_LENGTH;
  const min = 10 ** (AUTH_CONSTANTS.OTP_LENGTH - 1);
  return String(randomInt(min, max));
}

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

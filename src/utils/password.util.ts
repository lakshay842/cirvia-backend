import bcrypt from 'bcrypt';
import { ValidationError } from '@errors/index.js';
import { AUTH_CONSTANTS, COMMON_PASSWORDS } from '../modules/auth/constants/auth.constants.js';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, AUTH_CONSTANTS.BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): void {
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters.', { field: 'password' });
  }

  if (!PASSWORD_REGEX.test(password)) {
    throw new ValidationError(
      'Password must include uppercase, lowercase, number, and special character.',
      { field: 'password' },
    );
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new ValidationError('Password is too common. Please choose a stronger password.', {
      field: 'password',
    });
  }
}

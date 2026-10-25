import { z } from 'zod';

const emailSchema = z.string().trim().email('Invalid email address.');
const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Invalid phone number.')
  .max(15, 'Invalid phone number.');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters.');

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required.').max(50),
    lastName: z.string().trim().min(1, 'Last name is required.').max(50),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and conditions.' }),
    }),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required.'),
    rememberMe: z.boolean().optional(),
  })
  .strict();

export const loginPhoneSchema = z
  .object({
    phone: phoneSchema,
    otp: z.string().length(6, 'OTP must be 6 digits.'),
  })
  .strict();

export const googleLoginSchema = z
  .object({
    idToken: z.string().min(1, 'Google ID token is required.'),
  })
  .strict();

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1, 'Refresh token is required.'),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required.'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const verifyEmailSchema = z
  .object({
    token: z.string().min(1, 'Verification token is required.'),
  })
  .strict();

export const sendPhoneOtpSchema = z
  .object({
    phone: phoneSchema,
  })
  .strict();

export const verifyPhoneOtpSchema = z
  .object({
    phone: phoneSchema,
    otp: z.string().length(6, 'OTP must be 6 digits.'),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const logoutAllSchema = z.object({}).strict();

export const deleteAccountSchema = z
  .object({
    password: z.string().min(1, 'Password is required to delete account.'),
  })
  .strict();

export const sessionIdParamSchema = z
  .object({
    sessionId: z.string().uuid('Invalid session ID.'),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LoginPhoneInput = z.infer<typeof loginPhoneSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

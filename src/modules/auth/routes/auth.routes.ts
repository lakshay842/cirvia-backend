import { Router } from 'express';
import { authController } from '../controller/auth.controller.js';
import { validateRequest } from '@middleware/validate.middleware.js';
import { authenticate } from '@middleware/auth.middleware.js';
import { authRateLimiter } from '@middleware/rate-limit.middleware.js';
import {
  registerSchema,
  loginSchema,
  loginPhoneSchema,
  googleLoginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
  changePasswordSchema,
  deleteAccountSchema,
  sessionIdParamSchema,
} from '../schemas/auth.schema.js';

const router = Router();

router.use(authRateLimiter());

router.post('/register', validateRequest({ body: registerSchema }), authController.register);
router.post('/login', validateRequest({ body: loginSchema }), authController.login);
router.post(
  '/login-phone',
  validateRequest({ body: loginPhoneSchema }),
  authController.loginPhone,
);
router.post(
  '/google',
  validateRequest({ body: googleLoginSchema }),
  authController.googleLogin,
);
router.post('/refresh', validateRequest({ body: refreshTokenSchema }), authController.refresh);
router.post('/logout', authController.logout);
router.post(
  '/forgot-password',
  validateRequest({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  validateRequest({ body: resetPasswordSchema }),
  authController.resetPassword,
);
router.post(
  '/verify-email',
  validateRequest({ body: verifyEmailSchema }),
  authController.verifyEmail,
);
router.post(
  '/send-phone-otp',
  validateRequest({ body: sendPhoneOtpSchema }),
  authController.sendPhoneOtp,
);

router.post(
  '/send-email-verification',
  authenticate,
  authController.sendEmailVerification,
);
router.post(
  '/verify-phone-otp',
  authenticate,
  validateRequest({ body: verifyPhoneOtpSchema }),
  authController.verifyPhoneOtp,
);
router.post(
  '/change-password',
  authenticate,
  validateRequest({ body: changePasswordSchema }),
  authController.changePassword,
);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/sessions', authenticate, authController.listSessions);
router.delete(
  '/sessions/:sessionId',
  authenticate,
  validateRequest({ params: sessionIdParamSchema }),
  authController.revokeSession,
);
router.delete(
  '/account',
  authenticate,
  validateRequest({ body: deleteAccountSchema }),
  authController.deleteAccount,
);

export const authRouter = router;

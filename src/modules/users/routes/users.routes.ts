import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '@middleware/auth.middleware.js';
import { requirePermission } from '@middleware/authorize.middleware.js';
import { validateRequest } from '@middleware/validate.middleware.js';
import { avatarUpload, coverImageUpload } from '../../../middleware/upload.middleware.js';
import { usersController } from '../controller/users.controller.js';
import { reviewsController } from '../../reviews/controller/reviews.controller.js';
import { reviewListQuerySchema } from '../../reviews/schemas/reviews.schema.js';
import {
  adminUpdateUserSchema,
  adminUserListQuerySchema,
  deviceIdParamSchema,
  followUserBodySchema,
  paginationQuerySchema,
  providerParamSchema,
  unfollowIdParamSchema,
  updateAccountSettingsSchema,
  updateInterestsSchema,
  updateNotificationSettingsSchema,
  updatePrivacySettingsSchema,
  updateProfileSchema,
  userIdParamSchema,
  usernameParamSchema,
} from '../schemas/users.schema.js';

const router = Router();

// ─── Authenticated profile ───────────────────────────────────────────────────

router.get('/me', authenticate, usersController.getMe);
router.get(
  '/me/reviews',
  authenticate,
  validateRequest({ query: reviewListQuerySchema }),
  reviewsController.listMyReviews,
);
router.get('/me/saved-events', authenticate, validateRequest({ query: paginationQuerySchema }), usersController.listSavedEvents);
router.get('/me/settings', authenticate, usersController.getSettings);
router.get('/me/settings/privacy', authenticate, usersController.getPrivacySettings);
router.patch(
  '/me/settings/privacy',
  authenticate,
  validateRequest({ body: updatePrivacySettingsSchema }),
  usersController.updatePrivacySettings,
);
router.get('/me/settings/account', authenticate, usersController.getAccountSettings);
router.patch(
  '/me/settings/account',
  authenticate,
  validateRequest({ body: updateAccountSettingsSchema }),
  usersController.updateAccountSettings,
);
router.get('/me/settings/notifications', authenticate, usersController.getNotificationSettings);
router.patch(
  '/me/settings/notifications',
  authenticate,
  validateRequest({ body: updateNotificationSettingsSchema }),
  usersController.updateNotificationSettings,
);
router.get('/me/devices', authenticate, usersController.listDevices);
router.delete(
  '/me/devices/:deviceId',
  authenticate,
  validateRequest({ params: deviceIdParamSchema }),
  usersController.removeDevice,
);
router.get('/me/connected-accounts', authenticate, usersController.listConnectedAccounts);
router.delete(
  '/me/connected-accounts/:provider',
  authenticate,
  validateRequest({ params: providerParamSchema }),
  usersController.disconnectAccount,
);

router.patch(
  '/profile',
  authenticate,
  validateRequest({ body: updateProfileSchema }),
  usersController.updateProfile,
);
router.post(
  '/avatar',
  authenticate,
  avatarUpload,
  usersController.uploadAvatar,
);
router.post(
  '/cover-image',
  authenticate,
  coverImageUpload,
  usersController.uploadCoverImage,
);

router.get('/interests', authenticate, usersController.getInterests);
router.patch(
  '/interests',
  authenticate,
  validateRequest({ body: updateInterestsSchema }),
  usersController.updateInterests,
);

router.get('/trust-score', authenticate, usersController.getTrustScore);

// ─── Follow (API_CONTRACT1 style) ───────────────────────────────────────────

router.get(
  '/followers',
  authenticate,
  validateRequest({ query: paginationQuerySchema }),
  usersController.getMyFollowers,
);
router.get(
  '/following',
  authenticate,
  validateRequest({ query: paginationQuerySchema }),
  usersController.getMyFollowing,
);
router.post(
  '/follow',
  authenticate,
  validateRequest({ body: followUserBodySchema }),
  usersController.followUserBody,
);
router.delete(
  '/unfollow/:id',
  authenticate,
  validateRequest({ params: unfollowIdParamSchema }),
  usersController.unfollowById,
);

// ─── Follow (API_CONTRACT4 style) ─────────────────────────────────────────────

router.post(
  '/:userId/follow',
  authenticate,
  validateRequest({ params: userIdParamSchema }),
  usersController.followUserById,
);
router.delete(
  '/:userId/follow',
  authenticate,
  validateRequest({ params: userIdParamSchema }),
  usersController.unfollowUserById,
);
router.get(
  '/:userId/followers',
  validateRequest({ params: userIdParamSchema, query: paginationQuerySchema }),
  usersController.getUserFollowers,
);
router.get(
  '/:userId/following',
  validateRequest({ params: userIdParamSchema, query: paginationQuerySchema }),
  usersController.getUserFollowing,
);

// ─── Public profiles & activity ───────────────────────────────────────────────

router.get(
  '/:username/activity',
  optionalAuthenticate,
  validateRequest({ params: usernameParamSchema }),
  usersController.getPublicActivity,
);
router.get(
  '/:username',
  optionalAuthenticate,
  validateRequest({ params: usernameParamSchema }),
  usersController.getPublicProfile,
);

export const usersRouter = router;

export const adminUsersRouter = Router();

adminUsersRouter.use(authenticate);

adminUsersRouter.get(
  '/',
  requirePermission('users.read'),
  validateRequest({ query: adminUserListQuerySchema }),
  usersController.listAdminUsers,
);
adminUsersRouter.get(
  '/:userId',
  requirePermission('users.read'),
  validateRequest({ params: userIdParamSchema }),
  usersController.getAdminUser,
);
adminUsersRouter.patch(
  '/:userId',
  requirePermission('users.update'),
  validateRequest({ params: userIdParamSchema, body: adminUpdateUserSchema }),
  usersController.updateAdminUser,
);
adminUsersRouter.patch(
  '/:userId/suspend',
  requirePermission('users.update'),
  validateRequest({ params: userIdParamSchema }),
  usersController.suspendUser,
);
adminUsersRouter.patch(
  '/:userId/ban',
  requirePermission('users.update'),
  validateRequest({ params: userIdParamSchema }),
  usersController.banUser,
);
adminUsersRouter.patch(
  '/:userId/restore',
  requirePermission('users.update'),
  validateRequest({ params: userIdParamSchema }),
  usersController.restoreUser,
);
adminUsersRouter.delete(
  '/:userId',
  requirePermission('users.delete'),
  validateRequest({ params: userIdParamSchema }),
  usersController.softDeleteUser,
);

// Trust score routes (API_CONTRACT4)
export const trustScoreRouter = Router();
trustScoreRouter.get('/', authenticate, usersController.getTrustScore);
trustScoreRouter.get(
  '/history',
  authenticate,
  validateRequest({ query: paginationQuerySchema }),
  usersController.getTrustScoreHistory,
);
trustScoreRouter.get('/factors', authenticate, usersController.getTrustFactors);

// Activity feed (API_CONTRACT4)
export const activityRouter = Router();
activityRouter.get(
  '/',
  authenticate,
  validateRequest({ query: paginationQuerySchema }),
  usersController.getMyActivity,
);

// Notification preferences (API_CONTRACT4)
export const notificationPreferencesRouter = Router();
notificationPreferencesRouter.get('/', authenticate, usersController.getNotificationSettings);
notificationPreferencesRouter.patch(
  '/',
  authenticate,
  validateRequest({ body: updateNotificationSettingsSchema }),
  usersController.updateNotificationSettings,
);

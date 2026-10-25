import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@common/index.js';
import type { ApiMeta } from '@common/index.js';
import { HTTP_STATUS } from '@constants/index.js';
import { usersService } from '../service/users.service.js';
import type {
  AdminUpdateUserInput,
  AdminUserListQuery,
  FollowUserBodyInput,
  PaginationQuery,
  UpdateAccountSettingsInput,
  UpdateInterestsInput,
  UpdateNotificationSettingsInput,
  UpdatePrivacySettingsInput,
  UpdateProfileInput,
} from '../schemas/users.schema.js';

function auditMeta(req: Request): { ip?: string; browser?: string } {
  const meta: { ip?: string; browser?: string } = {};
  if (req.ip) meta.ip = req.ip;
  const browser = req.headers['user-agent'];
  if (browser) meta.browser = browser;
  return meta;
}

export class UsersController {
  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await usersService.getMyProfile(req.user!.id);
      sendSuccess(res, { message: 'Profile retrieved.', data: { user: profile } });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await usersService.updateProfile(
        req.user!.id,
        req.body as UpdateProfileInput,
      );
      sendSuccess(res, { message: 'Profile updated successfully.', data: { user: profile } });
    } catch (error) {
      next(error);
    }
  };

  uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await usersService.uploadAvatar(req.user!.id, req.file!);
      sendSuccess(res, { message: 'Avatar uploaded successfully.', data: result });
    } catch (error) {
      next(error);
    }
  };

  uploadCoverImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await usersService.uploadCoverImage(req.user!.id, req.file!);
      sendSuccess(res, { message: 'Cover image uploaded successfully.', data: result });
    } catch (error) {
      next(error);
    }
  };

  getPublicProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username } = req.params as { username: string };
      const profile = await usersService.getPublicProfile(username, req.user?.id);
      sendSuccess(res, { message: 'Profile retrieved.', data: { profile } });
    } catch (error) {
      next(error);
    }
  };

  getInterests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await usersService.getInterests(req.user!.id);
      sendSuccess(res, { message: 'Interests retrieved.', data });
    } catch (error) {
      next(error);
    }
  };

  updateInterests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await usersService.updateInterests(
        req.user!.id,
        req.body as UpdateInterestsInput,
      );
      sendSuccess(res, { message: 'Interests updated successfully.', data });
    } catch (error) {
      next(error);
    }
  };

  getSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const settings = await usersService.getUserSettings(req.user!.id);
      sendSuccess(res, { message: 'Settings retrieved.', data: settings });
    } catch (error) {
      next(error);
    }
  };

  getPrivacySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const privacy = await usersService.getPrivacySettings(req.user!.id);
      sendSuccess(res, { message: 'Privacy settings retrieved.', data: { privacy } });
    } catch (error) {
      next(error);
    }
  };

  updatePrivacySettings = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const privacy = await usersService.updatePrivacySettings(
        req.user!.id,
        req.body as UpdatePrivacySettingsInput,
      );
      sendSuccess(res, { message: 'Privacy settings updated.', data: { privacy } });
    } catch (error) {
      next(error);
    }
  };

  getAccountSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const account = await usersService.getAccountSettings(req.user!.id);
      sendSuccess(res, { message: 'Account settings retrieved.', data: { account } });
    } catch (error) {
      next(error);
    }
  };

  updateAccountSettings = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const account = await usersService.updateAccountSettings(
        req.user!.id,
        req.body as UpdateAccountSettingsInput,
      );
      sendSuccess(res, { message: 'Account settings updated.', data: { account } });
    } catch (error) {
      next(error);
    }
  };

  getNotificationSettings = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const preferences = await usersService.getNotificationSettings(req.user!.id);
      sendSuccess(res, { message: 'Notification preferences retrieved.', data: preferences });
    } catch (error) {
      next(error);
    }
  };

  updateNotificationSettings = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const preferences = await usersService.updateNotificationSettings(
        req.user!.id,
        req.body as UpdateNotificationSettingsInput,
      );
      sendSuccess(res, { message: 'Notification preferences updated.', data: preferences });
    } catch (error) {
      next(error);
    }
  };

  listDevices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const devices = await usersService.listDevices(req.user!.id);
      sendSuccess(res, { message: 'Devices retrieved.', data: { devices } });
    } catch (error) {
      next(error);
    }
  };

  removeDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { deviceId } = req.params as { deviceId: string };
      const result = await usersService.removeDevice(req.user!.id, deviceId);
      sendSuccess(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  };

  listConnectedAccounts = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const accounts = await usersService.listConnectedAccounts(req.user!.id);
      sendSuccess(res, { message: 'Connected accounts retrieved.', data: { accounts } });
    } catch (error) {
      next(error);
    }
  };

  disconnectAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { provider } = req.params as { provider: string };
      const result = await usersService.disconnectConnectedAccount(req.user!.id, provider);
      sendSuccess(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  };

  getTrustScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trustScore = await usersService.getTrustScore(req.user!.id);
      sendSuccess(res, { message: 'Trust score retrieved.', data: { trustScore } });
    } catch (error) {
      next(error);
    }
  };

  getTrustScoreHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await usersService.getTrustScoreHistory(
        req.user!.id,
        req.query as PaginationQuery,
      );
      sendSuccess(res, {
        message: 'Trust score history retrieved.',
        data: { history: result.history },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  getTrustFactors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const factors = await usersService.getTrustFactors(req.user!.id);
      sendSuccess(res, { message: 'Trust factors retrieved.', data: { factors } });
    } catch (error) {
      next(error);
    }
  };

  getMyActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await usersService.getMyActivity(req.user!.id, req.query as PaginationQuery);
      sendSuccess(res, {
        message: 'Activity feed retrieved.',
        data: { activities: result.activities },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  getPublicActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username } = req.params as { username: string };
      const result = await usersService.getPublicActivity(username, req.user?.id);
      sendSuccess(res, {
        message: 'Activity feed retrieved.',
        data: { activities: result.activities },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  listSavedEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await usersService.listSavedEvents(
        req.user!.id,
        req.query as PaginationQuery,
      );
      sendSuccess(res, {
        message: 'Saved events retrieved.',
        data: { events: result.events },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  followUserBody = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.body as FollowUserBodyInput;
      const result = await usersService.followUser(req.user!.id, userId);
      sendSuccess(res, { message: result.message, statusCode: HTTP_STATUS.CREATED });
    } catch (error) {
      next(error);
    }
  };

  followUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params as { userId: string };
      const result = await usersService.followUser(req.user!.id, userId);
      sendSuccess(res, { message: result.message, statusCode: HTTP_STATUS.CREATED });
    } catch (error) {
      next(error);
    }
  };

  unfollowById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const result = await usersService.unfollowUser(req.user!.id, id);
      sendSuccess(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  };

  unfollowUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params as { userId: string };
      const result = await usersService.unfollowUser(req.user!.id, userId);
      sendSuccess(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  };

  getMyFollowers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await usersService.listFollowers(
        req.user!.id,
        req.query as PaginationQuery,
      );
      sendSuccess(res, {
        message: 'Followers retrieved.',
        data: { followers: result.followers },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  getMyFollowing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await usersService.listFollowing(
        req.user!.id,
        req.query as PaginationQuery,
      );
      sendSuccess(res, {
        message: 'Following retrieved.',
        data: { following: result.following },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  getUserFollowers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params as { userId: string };
      const result = await usersService.listFollowers(userId, req.query as PaginationQuery);
      sendSuccess(res, {
        message: 'Followers retrieved.',
        data: { followers: result.followers },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  getUserFollowing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params as { userId: string };
      const result = await usersService.listFollowing(userId, req.query as PaginationQuery);
      sendSuccess(res, {
        message: 'Following retrieved.',
        data: { following: result.following },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  // ─── Admin ─────────────────────────────────────────────────────────────────

  listAdminUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await usersService.listAdminUsers(req.query as AdminUserListQuery);
      sendSuccess(res, {
        message: 'Users retrieved.',
        data: { items: result.items },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  getAdminUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params as { userId: string };
      const user = await usersService.getAdminUser(userId);
      sendSuccess(res, { message: 'User retrieved.', data: { user } });
    } catch (error) {
      next(error);
    }
  };

  updateAdminUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params as { userId: string };
      const user = await usersService.updateAdminUser(
        userId,
        req.user!.id,
        req.body as AdminUpdateUserInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'User updated.', data: { user } });
    } catch (error) {
      next(error);
    }
  };

  suspendUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params as { userId: string };
      const user = await usersService.suspendUser(userId, req.user!.id, auditMeta(req));
      sendSuccess(res, { message: 'User suspended.', data: { user } });
    } catch (error) {
      next(error);
    }
  };

  banUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params as { userId: string };
      const user = await usersService.banUser(userId, req.user!.id, auditMeta(req));
      sendSuccess(res, { message: 'User banned.', data: { user } });
    } catch (error) {
      next(error);
    }
  };

  restoreUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params as { userId: string };
      const user = await usersService.restoreUser(userId, req.user!.id, auditMeta(req));
      sendSuccess(res, { message: 'User restored.', data: { user } });
    } catch (error) {
      next(error);
    }
  };

  softDeleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params as { userId: string };
      const user = await usersService.softDeleteUser(userId, req.user!.id, auditMeta(req));
      sendSuccess(res, { message: 'User deleted.', data: { user } });
    } catch (error) {
      next(error);
    }
  };
}

export const usersController = new UsersController();

import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@common/index.js';
import { HTTP_STATUS } from '@constants/index.js';
import { NotFoundError } from '@errors/index.js';
import { authService } from '../service/auth.service.js';
import { authRepository } from '../repository/auth.repository.js';
import { getDeviceContext } from '../utils/auth.helpers.js';
import { toAuthTokensResponseDto, toRefreshTokenResponseDto } from '../dto/auth.dto.js';
import type {
  RegisterInput,
  LoginInput,
  LoginPhoneInput,
  RefreshTokenInput,
} from '../schemas/auth.schema.js';

function auditMeta(req: Request): { ip?: string; browser?: string } {
  const meta: { ip?: string; browser?: string } = {};
  if (req.ip) meta.ip = req.ip;
  const browser = req.headers['user-agent'];
  if (browser) meta.browser = browser;
  return meta;
}

export class AuthController {
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.register(req.body as RegisterInput);
      sendSuccess(res, {
        message: result.message,
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.login(
        req.body as LoginInput,
        getDeviceContext(req),
        auditMeta(req),
      );
      sendSuccess(res, {
        message: 'Login successful.',
        data: toAuthTokensResponseDto(result.tokens, result.user),
      });
    } catch (error) {
      next(error);
    }
  };

  loginPhone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.loginWithPhone(
        req.body as LoginPhoneInput,
        getDeviceContext(req),
        auditMeta(req),
      );
      sendSuccess(res, {
        message: 'Login successful.',
        data: toAuthTokensResponseDto(result.tokens, result.user),
      });
    } catch (error) {
      next(error);
    }
  };

  googleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { idToken } = req.body as { idToken: string };
      const result = await authService.googleLogin(idToken, getDeviceContext(req));
      sendSuccess(res, {
        message: 'Login successful.',
        data: toAuthTokensResponseDto(result.tokens, result.user),
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.refreshToken(req.body as RefreshTokenInput);
      sendSuccess(res, {
        message: 'Token refreshed successfully.',
        data: toRefreshTokenResponseDto(result),
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
      const refreshToken = (req.body as { refreshToken?: string }).refreshToken;
      await authService.logout(accessToken, refreshToken, req.user?.id);
      sendSuccess(res, { message: 'Logout successful.' });
    } catch (error) {
      next(error);
    }
  };

  logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await authService.logoutAllDevices(req.user!.id);
      sendSuccess(res, { message: 'Logged out from all devices.' });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body as { email: string };
      const result = await authService.forgotPassword(email);
      sendSuccess(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, password } = req.body as { token: string; password: string };
      const result = await authService.resetPassword(token, password);
      sendSuccess(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  };

  sendEmailVerification = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await authService.sendEmailVerification(req.user!.id);
      sendSuccess(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.body as { token: string };
      const result = await authService.verifyEmail(token);
      sendSuccess(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  };

  sendPhoneOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone } = req.body as { phone: string };
      const result = await authService.sendPhoneOtp(phone, req.user?.id);
      sendSuccess(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  };

  verifyPhoneOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone, otp } = req.body as { phone: string; otp: string };
      const result = await authService.verifyPhoneOtp(req.user!.id, phone, otp);
      sendSuccess(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };
      const result = await authService.changePassword(
        req.user!.id,
        currentPassword,
        newPassword,
      );
      sendSuccess(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { password } = req.body as { password: string };
      const result = await authService.deleteAccount(req.user!.id, password);
      sendSuccess(res, { message: result.message });
    } catch (error) {
      next(error);
    }
  };

  listSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessions = await authService.listSessions(req.user!.id, req.user!.sessionId);
      sendSuccess(res, {
        message: 'Sessions retrieved.',
        data: { sessions },
      });
    } catch (error) {
      next(error);
    }
  };

  revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId } = req.params as { sessionId: string };
      await authService.revokeSession(req.user!.id, sessionId);
      sendSuccess(res, { message: 'Session revoked successfully.' });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fullUser = await authRepository.findById(req.user!.id);
      if (!fullUser) {
        throw new NotFoundError('User not found.');
      }
      sendSuccess(res, {
        message: 'Profile retrieved.',
        data: { user: authService.mapPublicUser(fullUser) },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();

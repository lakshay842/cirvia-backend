import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '@errors/index.js';
import { jwtProvider } from '../providers/jwt/jwt.provider.js';
import { isTokenBlacklisted } from '../providers/redis/auth.redis.js';
import {
  authRepository,
  extractRolesAndPermissions,
} from '../modules/auth/repository/auth.repository.js';
import type { AuthenticatedUser } from '../modules/auth/types/auth.types.js';
import { AccountStatus } from '@prisma/client';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7);
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedError('Authentication required.');
    }

    const payload = jwtProvider.verifyAccessToken(token);

    if (await isTokenBlacklisted(payload.jti)) {
      throw new UnauthorizedError('Token has been revoked.');
    }

    const session = await authRepository.findSessionById(payload.sessionId);
    if (!session) {
      throw new UnauthorizedError('Session expired.');
    }

    const user = await authRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedError('User not found.');
    }

    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new ForbiddenError('Your account has been suspended.');
    }

    if (user.accountStatus === AccountStatus.DELETED || user.isDeleted) {
      throw new UnauthorizedError('Account is not active.');
    }

    const { roles, permissions } = extractRolesAndPermissions(user);

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      accountStatus: user.accountStatus,
      provider: user.provider,
      roles,
      permissions,
      sessionId: payload.sessionId,
    };

    req.user = authUser;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Access token expired.'));
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid access token.'));
      return;
    }
    next(error);
  }
}

export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    next();
    return;
  }
  await authenticate(req, _res, next);
}

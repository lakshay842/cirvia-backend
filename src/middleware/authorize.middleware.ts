import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '@errors/index.js';

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));
    if (!hasRole) {
      next(new ForbiddenError('Insufficient role permissions.'));
      return;
    }

    next();
  };
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    const hasPermission = permissions.every((perm) => req.user!.permissions.includes(perm));
    if (!hasPermission) {
      next(new ForbiddenError('Insufficient permissions.'));
      return;
    }

    next();
  };
}

export function requireVerification(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }

  if (!req.user.emailVerified) {
    next(new ForbiddenError('Email verification required.'));
    return;
  }

  next();
}

export function requirePhoneVerification(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }

  if (!req.user.phoneVerified) {
    next(new ForbiddenError('Phone verification required.'));
    return;
  }

  next();
}

export function requireHost(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }

  const isHost = req.user.roles.includes('HOST');
  if (!isHost) {
    next(new ForbiddenError('Host access required.'));
    return;
  }

  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }

  const isAdmin = req.user.roles.some((r: string) => ['ADMIN', 'SUPER_ADMIN'].includes(r));
  if (!isAdmin) {
    next(new ForbiddenError('Admin access required.'));
    return;
  }

  next();
}

export function requireOwnership(getUserId: (req: Request) => string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    const resourceUserId = getUserId(req);
    const isAdmin = req.user.roles.some((r: string) => ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(r));

    if (!isAdmin && resourceUserId !== req.user.id) {
      next(new ForbiddenError('You do not have access to this resource.'));
      return;
    }

    next();
  };
}

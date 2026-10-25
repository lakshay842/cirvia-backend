import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '@config/index.js';
import type { JwtAccessPayload, JwtRefreshPayload, TokenPair } from '../../modules/auth/types/auth.types.js';

export class JwtProvider {
  signAccessToken(payload: Omit<JwtAccessPayload, 'type' | 'jti'>): {
    token: string;
    jti: string;
    expiresAt: Date;
  } {
    const config = getConfig();
    const jti = uuidv4();
    const token = jwt.sign(
      { ...payload, type: 'access', jti } satisfies JwtAccessPayload,
      config.JWT_SECRET,
      { expiresIn: config.JWT_ACCESS_EXPIRY } as jwt.SignOptions,
    );
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    const expiresAt = new Date((decoded.exp ?? 0) * 1000);
    return { token, jti, expiresAt };
  }

  signRefreshToken(payload: Omit<JwtRefreshPayload, 'type' | 'jti'>): {
    token: string;
    jti: string;
    expiresAt: Date;
  } {
    const config = getConfig();
    const jti = uuidv4();
    const token = jwt.sign(
      { ...payload, type: 'refresh', jti } satisfies JwtRefreshPayload,
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRY } as jwt.SignOptions,
    );
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    const expiresAt = new Date((decoded.exp ?? 0) * 1000);
    return { token, jti, expiresAt };
  }

  verifyAccessToken(token: string): JwtAccessPayload {
    const config = getConfig();
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtAccessPayload;
    if (payload.type !== 'access') {
      throw new jwt.JsonWebTokenError('Invalid token type');
    }
    return payload;
  }

  verifyRefreshToken(token: string): JwtRefreshPayload {
    const config = getConfig();
    const payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtRefreshPayload;
    if (payload.type !== 'refresh') {
      throw new jwt.JsonWebTokenError('Invalid token type');
    }
    return payload;
  }

  createTokenPair(
    userId: string,
    email: string,
    roles: string[],
    sessionId: string,
  ): TokenPair {
    const access = this.signAccessToken({ sub: userId, email, roles, sessionId });
    const refresh = this.signRefreshToken({ sub: userId, sessionId });
    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshTokenExpiresAt: refresh.expiresAt,
    };
  }
}

export const jwtProvider = new JwtProvider();

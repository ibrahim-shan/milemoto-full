import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

type Role = 'user' | 'admin';
type AccessPayload = { sub: string; role: Role };
type RefreshPayload = { sub: string; sid: string };

/**
 * Sign tokens always uses the CURRENT secret.
 * Old secrets are only used for verification during rotation.
 */
export function signAccess(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL_SEC });
}

export function signRefresh(
  payload: RefreshPayload,
  ttlSec = env.USER_REFRESH_TOKEN_TTL_SEC
): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: ttlSec });
}

/**
 * Verify with fallback to old secret for graceful rotation.
 * Tries current secret first, then old secret if configured and current fails.
 */
function verifyWithFallback<T>(token: string, currentSecret: string, oldSecret?: string): T {
  try {
    return jwt.verify(token, currentSecret) as T;
  } catch (err) {
    // Only try old secret if it exists and is different from current
    if (oldSecret && oldSecret !== currentSecret) {
      return jwt.verify(token, oldSecret) as T;
    }
    throw err;
  }
}

export function verifyAccess(token: string): AccessPayload {
  return verifyWithFallback<AccessPayload>(
    token,
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_SECRET_OLD
  );
}

export function verifyRefresh(token: string): RefreshPayload {
  return verifyWithFallback<RefreshPayload>(
    token,
    env.JWT_REFRESH_SECRET,
    env.JWT_REFRESH_SECRET_OLD
  );
}

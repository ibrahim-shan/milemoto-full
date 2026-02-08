import type { Response } from 'express';
import { env } from '../../../config/env.js';

// (Session/Cookie helpers)
export function cookieDomain() {
  return env.NODE_ENV === 'production' ? env.COOKIE_DOMAIN || undefined : undefined;
}

export function setRefreshCookie(
  res: Response,
  token: string,
  opts: { remember: boolean; maxAgeSec: number }
) {
  const base = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    domain: cookieDomain(),
    path: '/api',
  };
  if (opts.remember) {
    res.cookie(env.REFRESH_COOKIE_NAME, token, {
      ...base,
      maxAge: opts.maxAgeSec * 1000,
    });
  } else {
    res.cookie(env.REFRESH_COOKIE_NAME, token, base);
  }
}

export function ttlForRole(role: 'user' | 'admin', remember: boolean) {
  if (role === 'admin') {
    return remember
      ? Number(env.ADMIN_REFRESH_TOKEN_TTL_SEC)
      : Number(env.ADMIN_SESSION_REFRESH_TTL_SEC);
  }
  return remember
    ? Number(env.USER_REFRESH_TOKEN_TTL_SEC)
    : Number(env.USER_SESSION_REFRESH_TTL_SEC);
}

/**
 * Sets a readable session info cookie that the frontend middleware can use
 * to check role and expiry without making an API call.
 * This is NOT security-critical - the actual auth is done via HTTP-only refresh cookie.
 * The middleware will still call /refresh when this cookie is near expiry or missing.
 */
export function setSessionInfoCookie(
  res: Response,
  opts: { role: 'user' | 'admin'; expiresAt: Date; remember: boolean }
) {
  const value = JSON.stringify({
    role: opts.role,
    exp: opts.expiresAt.getTime(),
  });

  const base = {
    httpOnly: false, // Readable by client JS and middleware
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    domain: cookieDomain(),
    path: '/',
  };

  if (opts.remember) {
    res.cookie('mm_session_info', value, {
      ...base,
      maxAge: Math.floor(opts.expiresAt.getTime() - Date.now()),
    });
  } else {
    res.cookie('mm_session_info', value, base);
  }
}

export function clearSessionInfoCookie(res: Response) {
  res.clearCookie('mm_session_info', {
    httpOnly: false,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    domain: cookieDomain(),
    path: '/',
  });
}

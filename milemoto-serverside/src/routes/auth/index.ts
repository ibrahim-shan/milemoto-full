// src/routes/auth/index.ts
import { Router } from 'express';
import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { randToken, safeEquals } from '../../utils/crypto.js';
import { httpError } from '../../utils/error.js';
import { cookieDomain } from '../helpers/auth.helpers.js';
import { coreAuth } from './core.route.js';
import { passwordAuth } from './password.route.js';
import { mfaAuth } from './mfa.route.js';
import { deviceAuth } from './device.route.js';
import { userAuth } from './user.route.js';
import { oauthAuth } from './oauth.route.js';

export const auth = Router();

const CSRF_COOKIE_NAME = 'mmCsrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

function ensureCsrfCookie(req: Request, res: Response) {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  if (typeof existing === 'string' && existing.length >= 20) return existing;

  const token = randToken(32);
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: cookieDomain(),
    path: '/',
  });
  return token;
}

// Double-submit CSRF token bootstrap: call this before POSTing to /api/v1/auth from the browser.
auth.get('/csrf', (req, res) => {
  const token = ensureCsrfCookie(req, res);
  res.json({ csrfToken: token });
});

// CSRF defense-in-depth: check Origin/Referer for POSTs to /api/v1/auth
const allowedOrigins = new Set(env.CORS_ORIGINS.split(',').map((s) => s.trim()));
auth.use((req, res, next) => {
  if (req.method.toUpperCase() !== 'POST') return next();
  const origin = req.get('origin') || '';
  const referer = req.get('referer') || '';
  const allowByOrigin = origin && allowedOrigins.has(origin);
  let allowByReferer = false;
  if (referer) {
    try {
      const u = new URL(referer);
      allowByReferer = allowedOrigins.has(u.origin);
    } catch {}
  }

  const isNonBrowser = !origin && !referer;
  const isAllowedBrowser = allowByOrigin || allowByReferer;
  if (!isNonBrowser && !isAllowedBrowser) {
    return next(httpError(403, 'Forbidden', 'CSRF blocked'));
  }

  // Double-submit token check (browser requests only).
  if (!isNonBrowser) {
    const cookieToken = ensureCsrfCookie(req, res);
    const headerToken = String(req.get(CSRF_HEADER_NAME) || '');
    if (!headerToken) {
      return next(httpError(403, 'CsrfMissing', 'CSRF token missing'));
    }
    const ok = safeEquals(Buffer.from(cookieToken, 'utf8'), Buffer.from(headerToken, 'utf8'));
    if (!ok) {
      return next(httpError(403, 'CsrfInvalid', 'CSRF token invalid'));
    }
  }

  return next();
});

// Assemble all the sub-routers
auth.use(coreAuth);
auth.use(passwordAuth);
auth.use(mfaAuth);
auth.use(deviceAuth);
auth.use(userAuth);
auth.use(oauthAuth);

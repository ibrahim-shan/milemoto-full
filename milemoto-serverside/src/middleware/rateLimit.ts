// src/middleware/rateLimit.ts
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { env } from '../config/env.js';

const ipOf = (req: Request) => ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '');

export const authLimiter = rateLimit({
  windowMs: env.RATE_AUTH_WINDOW_MS,
  limit: env.RATE_AUTH_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => ipOf(req),
});

export const loginByIpLimiter = rateLimit({
  windowMs: env.RATE_LOGIN_IP_WINDOW_MS,
  limit: env.RATE_LOGIN_IP_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => ipOf(req),
});

export const loginByEmailLimiter = rateLimit({
  windowMs: env.RATE_LOGIN_EMAIL_WINDOW_MS,
  limit: env.RATE_LOGIN_EMAIL_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const identifier = (req.body?.identifier ?? req.body?.email ?? req.body?.phone ?? '')
      .toString()
      .trim();
    if (!identifier) return 'login:missing';
    if (identifier.includes('@')) return `email:${identifier.toLowerCase()}`;
    const normalized = identifier.replace(/[\s()\-]/g, '');
    return `phone:${normalized}`;
  },
});

export const uploadsByIpLimiter = rateLimit({
  windowMs: env.RATE_UPLOAD_IP_WINDOW_MS,
  limit: env.RATE_UPLOAD_IP_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => ipOf(req), // IPv6-safe via ipKeyGenerator
});

export const uploadsByUserLimiter = rateLimit({
  windowMs: env.RATE_UPLOAD_USER_WINDOW_MS,
  limit: env.RATE_UPLOAD_USER_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const uid = req.user?.id;
    // Fallback to IP if somehow missing (shouldn't happen because requireAuth runs first)
    return uid ? `uid:${uid}` : ipOf(req);
  },
});

export const mfaVerifyLimiter = rateLimit({
  windowMs: env.RATE_MFA_WINDOW_MS,
  limit: env.RATE_MFA_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ch = (req.body?.challengeId ?? '').toString().trim();
    // Scope primarily by challengeId; fall back to IP if missing
    return ch ? `mfa:${ch}` : ipOf(req);
  },
});

export const smsTestLimiter = rateLimit({
  windowMs: env.RATE_SMS_TEST_WINDOW_MS,
  limit: env.RATE_SMS_TEST_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const uid = req.user?.id;
    return uid ? `uid:${uid}` : ipOf(req);
  },
});

export const phoneVerifyStartLimiter = rateLimit({
  windowMs: env.RATE_PHONE_VERIFY_START_WINDOW_MS,
  limit: env.RATE_PHONE_VERIFY_START_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const uid = req.user?.id;
    return uid ? `uid:${uid}` : ipOf(req);
  },
});

export const phoneVerifyConfirmLimiter = rateLimit({
  windowMs: env.RATE_PHONE_VERIFY_CONFIRM_WINDOW_MS,
  limit: env.RATE_PHONE_VERIFY_CONFIRM_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const uid = req.user?.id;
    return uid ? `uid:${uid}` : ipOf(req);
  },
});

export const reviewWriteLimiter = rateLimit({
  windowMs: env.RATE_REVIEW_WRITE_WINDOW_MS,
  limit: env.RATE_REVIEW_WRITE_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    code: 'TooManyRequests',
    message: 'Too many review submissions/updates. Please wait and try again.',
  },
  keyGenerator: (req) => {
    const uid = req.user?.id;
    return uid ? `review:uid:${uid}` : `review:${ipOf(req)}`;
  },
});

/**
 * Rate limiter for all /api/v1/admin/* routes.
 * Uses authenticated user ID when available, falls back to IP.
 */
export const adminLimiter = rateLimit({
  windowMs: env.RATE_ADMIN_WINDOW_MS,
  limit: env.RATE_ADMIN_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const uid = req.user?.id;
    return uid ? `admin:uid:${uid}` : `admin:${ipOf(req)}`;
  },
});

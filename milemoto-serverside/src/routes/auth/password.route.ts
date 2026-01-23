// src/routes/auth/password.route.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/authz.js';
import { authLimiter, loginByEmailLimiter } from '../../middleware/rateLimit.js';
import type { OkResponseDto } from '@milemoto/types';
import { z } from 'zod';
import { ChangePassword, VerifyEmail, ResendVerification } from '../helpers/auth.helpers.js';
import { getUserOrThrow, requireUser } from './auth.middleware.js';
import { EmailSchema, PasswordSchema, PhoneSchema, TokenSchema } from '../helpers/validation.js';
import { handleAuthRouteError } from './errors.js';
import {
  changePassword,
  verifyEmailToken,
  resendVerificationEmail,
  requestPasswordReset,
  requestPasswordResetByPhone,
  resetPasswordWithToken,
} from '../../services/auth.service.js';

export const passwordAuth = Router();

// ===== Change Password (Logged-In) =====
passwordAuth.post('/change-password', requireAuth, requireUser, async (req, res, next) => {
  try {
    const userId = getUserOrThrow(req).id;

    const { oldPassword, newPassword } = ChangePassword.parse(req.body);
    await changePassword(String(userId), oldPassword, newPassword);
    res.json({ ok: true } as OkResponseDto);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

// ===== Verify Email =====
passwordAuth.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = VerifyEmail.parse(req.body);
    const result = await verifyEmailToken(token);
    res.json(result);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

// ===== Resend Verification Email =====
passwordAuth.post('/verify-email/resend', authLimiter, async (req, res, next) => {
  try {
    const { email } = ResendVerification.parse(req.body);
    const result = await resendVerificationEmail(email);
    res.json(result);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

/** POST /api/v1/auth/forgot */
passwordAuth.post('/forgot', authLimiter, loginByEmailLimiter, async (req, res, next) => {
  try {
    const email = EmailSchema.parse(req.body?.email);
    const result = await requestPasswordReset(email);
    res.json(result);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

/** POST /api/v1/auth/forgot/phone */
passwordAuth.post('/forgot/phone', authLimiter, loginByEmailLimiter, async (req, res, next) => {
  try {
    const phone = PhoneSchema.parse(req.body?.phone);
    const result = await requestPasswordResetByPhone(phone);
    res.json(result);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

/** POST /api/v1/auth/reset */
passwordAuth.post('/reset', async (req, res, next) => {
  try {
    const body = z
      .object({
        token: TokenSchema,
        password: PasswordSchema,
      })
      .parse(req.body);

    const result = await resetPasswordWithToken(body.token, body.password);
    res.json(result as OkResponseDto & { email: string | null });
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

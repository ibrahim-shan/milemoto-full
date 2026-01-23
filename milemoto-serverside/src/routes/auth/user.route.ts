// src/routes/auth/user.route.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/authz.js';
import { phoneVerifyConfirmLimiter, phoneVerifyStartLimiter } from '../../middleware/rateLimit.js';
import { UpdateProfile, VerifyPhoneCode } from '../helpers/auth.helpers.js';
import { EmailSchema } from '../helpers/validation.js';
import { getUserOrThrow, requireUser } from './auth.middleware.js';
import { handleAuthRouteError } from './errors.js';
import {
  getUserProfile,
  startEmailChange,
  startPhoneVerification,
  updateUserProfile,
  verifyPhoneCode,
} from '../../services/auth.service.js';

export const userAuth = Router();

/** GET /api/v1/auth/me */
userAuth.get('/me', requireAuth, requireUser, async (req, res, next) => {
  try {
    const userId = String(getUserOrThrow(req).id);
    const user = await getUserProfile(userId);
    res.json(user);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

/** POST /api/v1/auth/me/update - update full name and phone */
userAuth.post('/me/update', requireAuth, requireUser, async (req, res, next) => {
  try {
    const userId = String(getUserOrThrow(req).id);

    const body = UpdateProfile.parse(req.body);
    const user = await updateUserProfile(userId, {
      fullName: body.fullName,
      phone: body.phone,
    });
    res.json(user);
  } catch (e) {
    return handleAuthRouteError(e, req, res, next);
  }
});

/** POST /api/v1/auth/phone/verify/start - send verification code */
userAuth.post(
  '/phone/verify/start',
  requireAuth,
  requireUser,
  phoneVerifyStartLimiter,
  async (req, res, next) => {
    try {
      const userId = String(getUserOrThrow(req).id);
      const result = await startPhoneVerification(userId);
      res.json(result);
    } catch (e) {
      return handleAuthRouteError(e, req, res, next);
    }
  }
);

/** POST /api/v1/auth/email/change/start - send verification link to new email */
userAuth.post('/email/change/start', requireAuth, requireUser, async (req, res, next) => {
  try {
    const userId = String(getUserOrThrow(req).id);
    const email = EmailSchema.parse(req.body?.email);
    const result = await startEmailChange(userId, email);
    res.json(result);
  } catch (e) {
    return handleAuthRouteError(e, req, res, next);
  }
});

/** POST /api/v1/auth/phone/verify/confirm - verify phone code */
userAuth.post(
  '/phone/verify/confirm',
  requireAuth,
  requireUser,
  phoneVerifyConfirmLimiter,
  async (req, res, next) => {
    try {
      const userId = String(getUserOrThrow(req).id);
      const body = VerifyPhoneCode.parse(req.body);
      const result = await verifyPhoneCode(userId, body.code);
      res.json(result);
    } catch (e) {
      return handleAuthRouteError(e, req, res, next);
    }
  }
);

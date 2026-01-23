// src/routes/auth/mfa.route.ts
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/authz.js';
import { mfaVerifyLimiter } from '../../middleware/rateLimit.js';
import type { OkResponseDto } from '@milemoto/types';
import { DisableMfa } from '../helpers/auth.helpers.js';
import { getUserOrThrow, requireUser } from './auth.middleware.js';
import { MfaChallengeIdSchema, MfaCodeSchema, Totp6Schema } from '../helpers/validation.js';
import { handleAuthRouteError } from './errors.js';
import {
  startMfaSetup,
  verifyMfaSetup,
  disableMfa,
  regenerateBackupCodes,
  verifyMfaLogin,
} from '../../services/mfa.service.js';

export const mfaAuth = Router();

// ===== MFA: start setup =====
mfaAuth.post('/mfa/setup/start', requireAuth, requireUser, async (req, res, next) => {
  try {
    const userId = getUserOrThrow(req).id;

    const result = await startMfaSetup(String(userId));
    res.json(result);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

// ===== MFA: verify setup & enable =====
mfaAuth.post('/mfa/setup/verify', requireAuth, requireUser, async (req, res, next) => {
  try {
    const { challengeId, code } = z
      .object({
        challengeId: MfaChallengeIdSchema,
        code: Totp6Schema,
      })
      .parse(req.body);
    const userId = getUserOrThrow(req).id;

    const result = await verifyMfaSetup(String(userId), challengeId, code);
    res.json(result);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

// ===== MFA: disable (requires password + TOTP or backup code) =====
mfaAuth.post('/mfa/disable', requireAuth, requireUser, async (req, res, next) => {
  try {
    const userId = String(getUserOrThrow(req).id);
    const { password, code } = DisableMfa.parse(req.body);

    const result = await disableMfa(userId, password, code);
    res.json(result as OkResponseDto);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

// ===== MFA: regenerate backup codes =====
mfaAuth.post('/mfa/backup-codes/regen', requireAuth, requireUser, async (req, res, next) => {
  try {
    const userId = getUserOrThrow(req).id;

    const result = await regenerateBackupCodes(String(userId));
    res.json(result);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

// ===== MFA: verify login challenge =====
mfaAuth.post('/mfa/login/verify', mfaVerifyLimiter, async (req, res, next) => {
  try {
    const { challengeId, code, rememberDevice } = z
      .object({
        challengeId: MfaChallengeIdSchema,
        code: MfaCodeSchema,
        rememberDevice: z.boolean().optional().default(false),
      })
      .parse(req.body);

    const result = await verifyMfaLogin(challengeId, code, rememberDevice, req, res);
    res.json(result);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

// src/routes/auth/device.route.ts
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/authz.js';
import type { OkResponseDto } from '@milemoto/types';
import { env } from '../../config/env.js';
import { httpError } from '../../utils/error.js';
import { getUserOrThrow, requireUser } from './auth.middleware.js';
import { cookieDomain } from '../helpers/auth.helpers.js';
import { TokenSchema } from '../helpers/validation.js';
import { handleAuthRouteError } from './errors.js';
import {
  listTrustedDevices,
  revokeTrustedDevice,
  untrustCurrentDevice,
} from '../../services/auth.service.js';
import { revokeAllTrustedDevices } from '../helpers/auth.helpers.js';

export const deviceAuth = Router();

// ===== Trusted Devices: list and revoke =====
deviceAuth.get('/trusted-devices', requireAuth, requireUser, async (req, res, next) => {
  try {
    const userId = String(getUserOrThrow(req).id);
    const cookie = String(req.cookies?.mmTrusted || '');

    const devices = await listTrustedDevices(userId, cookie);
    res.json(devices);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

deviceAuth.post('/trusted-devices/revoke', requireAuth, requireUser, async (req, res, next) => {
  try {
    const userId = String(getUserOrThrow(req).id);
    const { id } = z.object({ id: TokenSchema }).parse(req.body);

    await revokeTrustedDevice(userId, id);

    // Clear cookie if it's the current device
    const cookie = String(req.cookies?.mmTrusted || '');
    const currentId = cookie.includes('.') ? cookie.split('.')[0] : '';
    if (currentId === id) {
      res.clearCookie('mmTrusted', {
        path: '/',
        domain: cookieDomain(),
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
      });
    }
    res.json({ ok: true } as OkResponseDto);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

deviceAuth.post('/trusted-devices/revoke-all', requireAuth, requireUser, async (req, res, next) => {
  try {
    const userId = String(getUserOrThrow(req).id);

    await revokeAllTrustedDevices(userId);

    if (req.cookies?.mmTrusted) {
      res.clearCookie('mmTrusted', {
        path: '/',
        domain: cookieDomain(),
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
      });
    }
    res.json({ ok: true } as OkResponseDto);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

deviceAuth.post(
  '/trusted-devices/untrust-current',
  requireAuth,
  requireUser,
  async (req, res, next) => {
    try {
      const userId = String(getUserOrThrow(req).id);
      const cookie = String(req.cookies?.mmTrusted || '');

      // Check if cookie exists
      if (!cookie) {
        throw httpError(
          400,
          'NoTrustedDevice',
          'No trusted device cookie found. This device is not currently trusted.'
        );
      }

      if (!cookie.includes('.')) {
        throw httpError(400, 'InvalidCookie', 'Invalid trusted device cookie format');
      }

      const parts = cookie.split('.');
      const id = parts[0];
      if (!id) {
        throw httpError(400, 'InvalidCookie', 'Invalid device cookie format');
      }

      await untrustCurrentDevice(userId, id);

      res.clearCookie('mmTrusted', {
        path: '/',
        domain: cookieDomain(),
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
      });
      res.json({ ok: true } as OkResponseDto);
    } catch (e) {
      handleAuthRouteError(e, req, res, next);
    }
  }
);

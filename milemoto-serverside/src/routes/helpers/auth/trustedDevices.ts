import type { Request, Response } from 'express';
import crypto from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { trusteddevices } from '@milemoto/types';
import { ulid } from 'ulid';
import { sha256 } from '../../../utils/crypto.js';
import { logger } from '../../../utils/logger.js';
import { env } from '../../../config/env.js';
import { runtimeFlags } from '../../../config/runtime.js';
import { ipPrefix } from '../../../utils/device.js';
import { dbNow } from '../../../db/time.js';
import { db } from '../../../db/drizzle.js';
import { cookieDomain } from './cookies.js';
import { toUserId } from './ids.js';
import { verifyTrustedDevice } from './crypto.js';

export async function validateTrustedCookie(
  req: Request,
  userId: string,
  role?: 'user' | 'admin'
): Promise<boolean> {
  try {
    const raw = String(req.cookies?.mmTrusted || '');
    if (!raw) {
      logger.info({ userId, reason: 'no_cookie' }, 'Trusted device validation: no cookie');
      return false;
    }

    const [id, token] = raw.split('.');
    if (id && token) {
      const [rec] = await db
        .select({
          id: trusteddevices.id,
          userId: trusteddevices.userId,
          tokenHash: trusteddevices.tokenHash,
          fingerPrint: trusteddevices.fingerPrint,
          expiresAt: trusteddevices.expiresAt,
          revokedAt: trusteddevices.revokedAt,
        })
        .from(trusteddevices)
        .where(eq(trusteddevices.id, id))
        .limit(1);
      if (!rec) {
        logger.info(
          { userId, deviceId: id, reason: 'device_not_found' },
          'Trusted device validation: device not found'
        );
        return false;
      }
      if (String(rec.userId) !== String(userId)) {
        logger.info(
          { userId, deviceId: id, deviceUserId: rec.userId, reason: 'user_mismatch' },
          'Trusted device validation: user mismatch'
        );
        return false;
      }
      if (rec.revokedAt) {
        logger.info(
          { userId, deviceId: id, reason: 'revoked' },
          'Trusted device validation: device revoked'
        );
        return false;
      }
      if (new Date(rec.expiresAt) <= new Date()) {
        logger.info(
          { userId, deviceId: id, expiresAt: rec.expiresAt, reason: 'expired' },
          'Trusted device validation: device expired'
        );
        return false;
      }
      if (sha256(token) !== rec.tokenHash) {
        logger.info(
          { userId, deviceId: id, reason: 'token_mismatch' },
          'Trusted device validation: token hash mismatch'
        );
        return false;
      }

      const needFp = role === 'admin' || runtimeFlags.trustedDeviceFpEnforceAll;
      if (needFp && rec.fingerPrint) {
        const ua = req.get('user-agent') || '';
        const current = sha256(`${ua}|${ipPrefix(req.ip)}`);
        if (current !== rec.fingerPrint) {
          try {
            logger.warn(
              {
                code: 'TrustedDeviceFingerprintMismatch',
                userId: String(userId),
                deviceId: String(rec.id),
                role,
                ipPrefix: ipPrefix(req.ip),
                uaHash: sha256(ua),
                storedFp: String(rec.fingerPrint).slice(0, 8),
                currentFp: current.slice(0, 8),
              },
              'Trusted device fingerprint mismatch; requiring MFA'
            );
          } catch {}
          return false;
        }
      }
      void db
        .update(trusteddevices)
        .set({ lastUsedAt: new Date() })
        .where(eq(trusteddevices.id, id));
      logger.info(
        { userId, deviceId: id, role },
        'Trusted device validation: SUCCESS - bypassing MFA'
      );
      return true;
    }

    const legacy = verifyTrustedDevice(raw);
    if (legacy && legacy.sub === String(userId) && legacy.exp > Date.now()) {
      logger.info(
        { userId, reason: 'legacy_token_valid' },
        'Trusted device validation: using legacy token'
      );
      return true;
    }
    logger.info(
      { userId, reason: 'invalid_format' },
      'Trusted device validation: invalid cookie format'
    );
    return false;
  } catch (e) {
    logger.warn({ e, userId }, 'validateTrustedCookie failed');
    return false;
  }
}

export async function createTrustedDevice(req: Request, res: Response, userId: string) {
  try {
    logger.info({ userId, remoteAddress: req.ip }, 'Creating trusted device...');
    const userIdNum = toUserId(userId);
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = sha256(token);
    const id = ulid();
    const now = await dbNow();
    const exp = new Date(now.getTime() + Number(env.TRUSTED_DEVICE_TTL_DAYS) * 24 * 60 * 60 * 1000);
    const ua = req.get('user-agent') ?? null;
    const fp = sha256(`${ua || ''}|${ipPrefix(req.ip)}`);
    await db.insert(trusteddevices).values({
      id,
      userId: userIdNum,
      tokenHash,
      fingerPrint: fp,
      userAgent: ua,
      ip: req.ip ?? null,
      expiresAt: exp,
      revokedAt: null,
      lastUsedAt: null,
    });
    res.cookie('mmTrusted', `${id}.${token}`, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: cookieDomain(),
      expires: exp,
      path: '/',
    });
    logger.info(
      { userId, deviceId: id, expiresAt: exp.toISOString() },
      'Trusted device created successfully'
    );
  } catch (e) {
    logger.error({ e, userId }, 'Failed to create trusted device');
  }
}

export async function revokeAllTrustedDevices(userId: string): Promise<void> {
  try {
    const userIdNum = toUserId(userId);
    await db
      .update(trusteddevices)
      .set({ revokedAt: new Date() })
      .where(and(eq(trusteddevices.userId, userIdNum), isNull(trusteddevices.revokedAt)));
  } catch (e) {
    logger.warn({ e, userId }, 'Failed to revoke trusted devices');
  }
}

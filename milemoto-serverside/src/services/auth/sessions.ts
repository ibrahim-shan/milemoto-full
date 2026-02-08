import argon2 from 'argon2';
import { ulid } from 'ulid';
import type { Request, Response } from 'express';
import { and, eq, isNull, or } from 'drizzle-orm';
import { mfaloginchallenges, sessions, users } from '@milemoto/types';
import type { AuthOutputDto, MfaChallengeDto, RefreshResponseDto } from '@milemoto/types';
import { httpError } from '../../utils/error.js';
import { signAccess, signRefresh, verifyRefresh } from '../../utils/jwt.js';
import { sha256 } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import { dbNow } from '../../db/time.js';
import { db } from '../../db/drizzle.js';
import {
  Login,
  validateTrustedCookie,
  setRefreshCookie,
  setSessionInfoCookie,
  clearSessionInfoCookie,
  ttlForRole,
  revokeAllTrustedDevices,
  cookieDomain,
} from '../../routes/helpers/auth.helpers.js';
import { z } from 'zod';
import { toUserId } from './shared.js';
import { logAuditEvent } from '../auditLog.service.js';

function normalizeLoginIdentifier(value: string) {
  const raw = value.trim();
  const isEmail = raw.includes('@');
  if (isEmail) {
    return { type: 'email' as const, value: raw.toLowerCase() };
  }
  const normalized = raw.replace(/[\s()\-]/g, '');
  const candidates = new Set<string>();
  if (normalized) {
    candidates.add(normalized);
    if (normalized.startsWith('+')) {
      candidates.add(normalized.slice(1));
    } else {
      candidates.add(`+${normalized}`);
    }
  }
  return { type: 'phone' as const, value: normalized, candidates: Array.from(candidates) };
}

export async function login(data: z.infer<typeof Login>, req: Request, res: Response) {
  const { identifier, password, remember } = data;
  const invalid = () => httpError(401, 'InvalidCredentials', 'Invalid credentials');

  const lookup = normalizeLoginIdentifier(identifier);
  const baseQuery = db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      passwordHash: users.passwordHash,
      role: users.role,
      status: users.status,
      mfaEnabled: users.mfaEnabled,
      emailVerifiedAt: users.emailVerifiedAt,
      phoneVerifiedAt: users.phoneVerifiedAt,
    })
    .from(users);

  const [u] =
    lookup.type === 'email'
      ? await baseQuery.where(eq(users.email, lookup.value)).limit(1)
      : await baseQuery
          .where(or(...lookup.candidates.map((phone) => eq(users.phone, phone))))
          .limit(1);
  if (!u) throw invalid();
  if (u.status !== 'active') {
    logger.warn(
      {
        code: 'LoginInactiveUser',
        identifier: sha256(lookup.value),
      },
      'Inactive login'
    );
    throw invalid();
  }

  const ok = await argon2.verify(u.passwordHash, password);
  if (!ok) {
    // Audit: Login failed
    void logAuditEvent({
      userId: 0, // Unknown user when login fails
      action: 'login_failed',
      entityType: 'auth',
      metadata: { identifier: sha256(lookup.value), reason: 'invalid_password' },
      ipAddress: req.ip ?? undefined,
      userAgent: req.get('user-agent') ?? undefined,
    });
    throw invalid();
  }

  if (!u.emailVerifiedAt) {
    logger.info(
      { code: 'LoginEmailUnverified', identifier: sha256(lookup.value) },
      'Unverified login'
    );
    throw httpError(403, 'EmailNotVerified', 'Please verify your email before signing in.');
  }

  if (Boolean(u.mfaEnabled)) {
    try {
      const isTrusted = await validateTrustedCookie(req, String(u.id), u.role as 'user' | 'admin');
      if (isTrusted) {
        const role = u.role as 'user' | 'admin';
        const ttlSec = ttlForRole(role, Boolean(remember));
        const sid = ulid();
        const refresh = signRefresh({ sub: String(u.id), sid }, ttlSec);
        const refreshHash = sha256(refresh);
        const now2 = await dbNow();

        const exp2 = new Date(now2.getTime() + ttlSec * 1000);
        await db.insert(sessions).values({
          id: sid,
          userId: Number(u.id),
          refreshHash,
          userAgent: req.get('user-agent') ?? null,
          ip: req.ip ?? null,
          remember: Boolean(remember),
          expiresAt: exp2,
          revokedAt: null,
          replacedBy: null,
        });
        setRefreshCookie(res, refresh, { remember: Boolean(remember), maxAgeSec: ttlSec });
        setSessionInfoCookie(res, { role, expiresAt: exp2, remember: Boolean(remember) });
        const access = signAccess({ sub: String(u.id), role });
        return {
          accessToken: access,
          user: {
            id: Number(u.id),
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            role,
            status: u.status,
            mfaEnabled: Boolean(u.mfaEnabled),
            phoneVerifiedAt: u.phoneVerifiedAt
              ? u.phoneVerifiedAt instanceof Date
                ? u.phoneVerifiedAt.toISOString()
                : String(u.phoneVerifiedAt)
              : null,
          },
        } as AuthOutputDto;
      }
    } catch (err) {
      logger.error(
        { err, userId: String(u.id) },
        'Trusted-device bypass failed; falling back to MFA'
      );
    }

    const pendingId = ulid();
    const now = await dbNow();
    const exp = new Date(now.getTime() + Number(env.MFA_LOGIN_TTL_SEC) * 1000);

    await db.insert(mfaloginchallenges).values({
      id: pendingId,
      userId: Number(u.id),
      remember: Boolean(remember),
      userAgent: req.get('user-agent') ?? null,
      ip: req.ip ?? null,
      expiresAt: exp,
      consumedAt: null,
    });

    return {
      mfaRequired: true,
      challengeId: pendingId,
      method: 'totpOrBackup',
      expiresAt: exp.toISOString(),
    } as MfaChallengeDto;
  }

  const role = u.role as 'user' | 'admin';
  const ttlSec = ttlForRole(role, Boolean(remember));
  const sid = ulid();
  const refresh = signRefresh({ sub: String(u.id), sid }, ttlSec);
  const refreshHash = sha256(refresh);

  const now2 = await dbNow();
  const exp2 = new Date(now2.getTime() + ttlSec * 1000);

  await db.insert(sessions).values({
    id: sid,
    userId: Number(u.id),
    refreshHash,
    userAgent: req.get('user-agent') ?? null,
    ip: req.ip ?? null,
    remember: Boolean(remember),
    expiresAt: exp2,
    revokedAt: null,
    replacedBy: null,
  });

  setRefreshCookie(res, refresh, { remember: Boolean(remember), maxAgeSec: ttlSec });
  setSessionInfoCookie(res, { role, expiresAt: exp2, remember: Boolean(remember) });
  const access = signAccess({ sub: String(u.id), role });

  // Audit: Successful login
  void logAuditEvent({
    userId: Number(u.id),
    action: 'login',
    entityType: 'auth',
    metadata: { role, remember: Boolean(remember) },
    ipAddress: req.ip ?? undefined,
    userAgent: req.get('user-agent') ?? undefined,
  });

  return {
    accessToken: access,
    user: {
      id: Number(u.id),
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role,
      status: u.status,
      mfaEnabled: Boolean(u.mfaEnabled),
      phoneVerifiedAt: u.phoneVerifiedAt
        ? u.phoneVerifiedAt instanceof Date
          ? u.phoneVerifiedAt.toISOString()
          : String(u.phoneVerifiedAt)
        : null,
    },
  } as AuthOutputDto;
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[env.REFRESH_COOKIE_NAME];
  if (!token) throw httpError(401, 'NoRefresh', 'No refresh token');

  let sid: string;
  let userId: string;
  try {
    const payload = verifyRefresh(token);
    sid = payload.sid;
    userId = payload.sub;
  } catch {
    throw httpError(401, 'InvalidToken', 'Invalid refresh token');
  }
  const userIdNum = toUserId(String(userId));

  const [s] = await db
    .select({
      refreshHash: sessions.refreshHash,
      revokedAt: sessions.revokedAt,
      expiresAt: sessions.expiresAt,
      remember: sessions.remember,
    })
    .from(sessions)
    .where(and(eq(sessions.id, sid), eq(sessions.userId, userIdNum)))
    .limit(1);
  if (!s || s.revokedAt || new Date(s.expiresAt) < new Date()) {
    throw httpError(401, 'InvalidSession', 'Invalid session');
  }
  if (sha256(token) !== s.refreshHash) {
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sid));
    throw httpError(401, 'TokenReuse', 'Token reuse detected');
  }

  const [urec] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userIdNum))
    .limit(1);
  if (!urec) throw httpError(401, 'UserNotFound', 'User not found');
  const role = urec.role as 'user' | 'admin';
  const remember = Boolean(s.remember);
  const ttlSec = ttlForRole(role, remember);

  const newSid = ulid();
  const newRefresh = signRefresh({ sub: userId, sid: newSid }, ttlSec);
  const newHash = sha256(newRefresh);

  await db
    .update(sessions)
    .set({ revokedAt: new Date(), replacedBy: newSid })
    .where(eq(sessions.id, sid));

  const now = await dbNow();
  const exp = new Date(now.getTime() + ttlSec * 1000);

  await db.insert(sessions).values({
    id: newSid,
    userId: userIdNum,
    refreshHash: newHash,
    userAgent: req.get('user-agent') ?? null,
    ip: req.ip ?? null,
    remember,
    expiresAt: exp,
    revokedAt: null,
    replacedBy: null,
  });

  setRefreshCookie(res, newRefresh, { remember, maxAgeSec: ttlSec });
  setSessionInfoCookie(res, { role, expiresAt: exp, remember });
  const access = signAccess({ sub: userId, role });

  // Audit: Token refresh
  void logAuditEvent({
    userId: userIdNum,
    action: 'refresh',
    entityType: 'auth',
    metadata: { newSessionId: newSid },
    ipAddress: req.ip ?? undefined,
    userAgent: req.get('user-agent') ?? undefined,
  });

  return { accessToken: access } as RefreshResponseDto;
}

export async function logout(req: Request, res: Response) {
  let userId: number | undefined;
  try {
    const token = req.cookies?.[env.REFRESH_COOKIE_NAME];
    if (token) {
      try {
        const { sid, sub } = verifyRefresh(token);
        userId = toUserId(sub);
        await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sid));
      } catch {
        /* ignore */
      }
    }
    res.clearCookie(env.REFRESH_COOKIE_NAME, {
      path: '/api',
      domain: cookieDomain(),
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
    });
    clearSessionInfoCookie(res);

    // Audit: Logout
    if (userId) {
      void logAuditEvent({
        userId,
        action: 'logout',
        entityType: 'auth',
        ipAddress: req.ip ?? undefined,
        userAgent: req.get('user-agent') ?? undefined,
      });
    }
  } catch {
    throw httpError(401, 'InvalidToken', 'Invalid token');
  }
}

export async function logoutAll(userId: string, res: Response) {
  const userIdNum = toUserId(userId);

  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userIdNum), isNull(sessions.revokedAt)));
  await revokeAllTrustedDevices(userId);

  res.clearCookie(env.REFRESH_COOKIE_NAME, {
    path: '/api',
    domain: cookieDomain(),
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  });
  res.clearCookie('mmTrusted', {
    path: '/',
    domain: cookieDomain(),
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  });
  clearSessionInfoCookie(res);

  logger.info({ code: 'UserLogoutAll', userId }, 'User requested logout on all devices');
}

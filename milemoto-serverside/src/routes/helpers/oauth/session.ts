import type { Request, Response } from 'express';
import { ulid } from 'ulid';
import { mfaloginchallenges, sessions } from '@milemoto/types';
import { db } from '../../../db/drizzle.js';
import { env } from '../../../config/env.js';
import { signRefresh } from '../../../utils/jwt.js';
import { sha256 } from '../../../utils/crypto.js';
import { dbNow } from '../../../db/time.js';
import { setRefreshCookie, ttlForRole } from '../auth.helpers.js';
import { buildOAuthRedirect } from './redirect.js';

export async function createSessionAndRedirect(opts: {
  userId: number;
  role: 'user' | 'admin';
  remember: boolean;
  req: Request;
  res: Response;
  nextPath: string;
}): Promise<string> {
  const ttlSec = ttlForRole(opts.role, opts.remember);
  const sid = ulid();
  const refresh = signRefresh({ sub: String(opts.userId), sid }, ttlSec);
  const refreshHash = sha256(refresh);
  const ua = opts.req.get('user-agent') ?? null;
  const ip = opts.req.ip ?? null;
  const now = await dbNow();
  const exp = new Date(now.getTime() + ttlSec * 1000);

  await db.insert(sessions).values({
    id: sid,
    userId: opts.userId,
    refreshHash,
    userAgent: ua,
    ip,
    remember: opts.remember,
    expiresAt: exp,
  });

  setRefreshCookie(opts.res, refresh, {
    remember: opts.remember,
    maxAgeSec: ttlSec,
  });

  return buildOAuthRedirect({ next: opts.nextPath });
}

export async function createMfaChallengeAndRedirect(opts: {
  userId: number;
  remember: boolean;
  req: Request;
  nextPath: string;
}): Promise<string> {
  const pendingId = ulid();
  const now = await dbNow();
  const exp = new Date(now.getTime() + Number(env.MFA_LOGIN_TTL_SEC) * 1000);

  await db.insert(mfaloginchallenges).values({
    id: pendingId,
    userId: opts.userId,
    remember: opts.remember,
    userAgent: opts.req.get('user-agent') ?? null,
    ip: opts.req.ip ?? null,
    expiresAt: exp,
  });

  return buildOAuthRedirect({ mfaChallengeId: pendingId, next: opts.nextPath });
}

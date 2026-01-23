import type { Request, Response } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { mfabackupcodes, mfaloginchallenges, sessions, users } from '@milemoto/types';
import type { AuthOutputDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { decryptFromBlob, sha256 } from '../../utils/crypto.js';
import { verifyTotp } from '../../utils/totp.js';
import {
  backupHash,
  createTrustedDevice,
  setRefreshCookie,
  ttlForRole,
} from '../../routes/helpers/auth.helpers.js';
import { dbNow } from '../../db/time.js';
import { signAccess, signRefresh } from '../../utils/jwt.js';
import { ulid } from 'ulid';

export async function verifyMfaLogin(
  challengeId: string,
  code: string,
  rememberDevice: boolean,
  req: Request,
  res: Response
) {
  const [rec] = await db
    .select({
      userId: mfaloginchallenges.userId,
      remember: mfaloginchallenges.remember,
      expiresAt: mfaloginchallenges.expiresAt,
      consumedAt: mfaloginchallenges.consumedAt,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      mfaSecretEnc: users.mfaSecretEnc,
    })
    .from(mfaloginchallenges)
    .innerJoin(users, eq(users.id, mfaloginchallenges.userId))
    .where(eq(mfaloginchallenges.id, challengeId))
    .limit(1);

  if (!rec || rec.consumedAt) throw httpError(400, 'InvalidChallenge', 'Invalid challenge');
  if (new Date(rec.expiresAt) < new Date())
    throw httpError(400, 'ChallengeExpired', 'Challenge expired');

  const userId = String(rec.userId);
  const userIdNum = Number(rec.userId);
  let ok = false;

  if (/^\d{6}$/.test(code)) {
    if (!rec.mfaSecretEnc) throw httpError(400, 'MfaMisconfigured', 'MFA misconfigured');
    const secretRaw = decryptFromBlob(rec.mfaSecretEnc);
    ok = verifyTotp(code, secretRaw);
  }

  if (!ok) {
    const h = backupHash(code.toUpperCase().trim());
    const [bc] = await db
      .select({ id: mfabackupcodes.id })
      .from(mfabackupcodes)
      .where(
        and(
          eq(mfabackupcodes.userId, userIdNum),
          eq(mfabackupcodes.codeHash, h),
          isNull(mfabackupcodes.usedAt)
        )
      )
      .limit(1);
    if (bc) {
      ok = true;
      await db
        .update(mfabackupcodes)
        .set({ usedAt: new Date() })
        .where(eq(mfabackupcodes.id, Number(bc.id)));
    }
  }

  if (!ok) throw httpError(400, 'InvalidCode', 'Invalid 2FA or backup code');

  await db
    .update(mfaloginchallenges)
    .set({ consumedAt: new Date() })
    .where(eq(mfaloginchallenges.id, challengeId));

  const role = rec.role as 'user' | 'admin';
  const remember = Boolean(rec.remember);
  const ttlSec = ttlForRole(role, remember);
  const sid = ulid();
  const refresh = signRefresh({ sub: userId, sid }, ttlSec);
  const refreshHash = sha256(refresh);
  const now = await dbNow();
  const exp = new Date(now.getTime() + ttlSec * 1000);

  await db.insert(sessions).values({
    id: sid,
    userId: userIdNum,
    refreshHash,
    userAgent: req.get('user-agent') ?? null,
    ip: req.ip ?? null,
    remember,
    expiresAt: exp,
    revokedAt: null,
    replacedBy: null,
  });

  setRefreshCookie(res, refresh, { remember, maxAgeSec: ttlSec });
  if (rememberDevice) {
    await createTrustedDevice(req, res, userId);
  }
  const access = signAccess({ sub: userId, role });
  return {
    accessToken: access,
    user: {
      id: Number(userId),
      fullName: rec.fullName,
      email: rec.email,
      phone: rec.phone,
      role,
      mfaEnabled: true,
    },
  } as AuthOutputDto;
}

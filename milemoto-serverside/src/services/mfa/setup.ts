import { and, eq } from 'drizzle-orm';
import { mfabackupcodes, mfachallenges, users } from '@milemoto/types';
import type { MfaSetupStartResponseDto, MfaSetupVerifyResponseDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { dbNow } from '../../db/time.js';
import { env } from '../../config/env.js';
import { httpError } from '../../utils/error.js';
import { decryptFromBlob, encryptToBlob } from '../../utils/crypto.js';
import {
  base32Encode,
  generateBackupCodes,
  generateTotpSecret,
  otpauthURL,
  verifyTotp,
} from '../../utils/totp.js';
import { revokeAllTrustedDevices } from '../../routes/helpers/auth.helpers.js';
import { ulid } from 'ulid';
import { toUserId } from '../auth/shared.js';

export async function startMfaSetup(userId: string) {
  const userIdNum = toUserId(userId);

  const [u] = await db
    .select({ email: users.email, mfaEnabled: users.mfaEnabled })
    .from(users)
    .where(eq(users.id, userIdNum))
    .limit(1);
  if (!u) throw httpError(404, 'UserNotFound', 'User not found');
  if (Boolean(u.mfaEnabled)) throw httpError(400, 'MfaAlreadyEnabled', 'MFA already enabled');

  const raw = generateTotpSecret(20);
  const secretEnc = encryptToBlob(raw);
  const challengeId = ulid();

  const exp = new Date((await dbNow()).getTime() + Number(env.MFA_CHALLENGE_TTL_SEC) * 1000);

  await db.insert(mfachallenges).values({
    id: challengeId,
    userId: userIdNum,
    secretEnc,
    expiresAt: exp,
    consumedAt: null,
  });

  const secretBase32 = base32Encode(raw);
  const uri = otpauthURL({
    issuer: 'MileMoto',
    account: u.email,
    secretBase32,
  });

  return {
    challengeId,
    secretBase32,
    otpauthUrl: uri,
    expiresAt: exp.toISOString(),
  } as MfaSetupStartResponseDto;
}

export async function verifyMfaSetup(userId: string, challengeId: string, code: string) {
  const userIdNum = toUserId(userId);

  const [ch] = await db
    .select({
      secretEnc: mfachallenges.secretEnc,
      expiresAt: mfachallenges.expiresAt,
      consumedAt: mfachallenges.consumedAt,
    })
    .from(mfachallenges)
    .where(and(eq(mfachallenges.id, challengeId), eq(mfachallenges.userId, userIdNum)))
    .limit(1);

  if (!ch || ch.consumedAt) throw httpError(400, 'InvalidChallenge', 'Invalid challenge');
  if (new Date(ch.expiresAt) < new Date())
    throw httpError(400, 'ChallengeExpired', 'Challenge expired');

  let secretRaw: Buffer;
  try {
    secretRaw = decryptFromBlob(ch.secretEnc);
  } catch {
    await db.delete(mfachallenges).where(eq(mfachallenges.id, challengeId));
    throw httpError(
      400,
      'InvalidChallenge',
      'MFA setup expired. Please restart the setup process.'
    );
  }
  if (!verifyTotp(code, secretRaw)) throw httpError(400, 'InvalidCode', 'Invalid 6-digit code');

  const { codes, hashes } = generateBackupCodes(10);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ mfaSecretEnc: ch.secretEnc, mfaEnabled: true })
      .where(eq(users.id, userIdNum));

    await tx
      .update(mfachallenges)
      .set({ consumedAt: new Date() })
      .where(eq(mfachallenges.id, challengeId));

    if (hashes.length) {
      await tx.insert(mfabackupcodes).values(
        hashes.map((h) => ({
          userId: userIdNum,
          codeHash: h,
        }))
      );
    }
  });

  await revokeAllTrustedDevices(String(userId));
  return { ok: true, backupCodes: codes } as MfaSetupVerifyResponseDto;
}

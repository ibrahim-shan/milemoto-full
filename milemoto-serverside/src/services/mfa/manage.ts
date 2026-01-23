import argon2 from 'argon2';
import { and, eq, isNull } from 'drizzle-orm';
import { mfabackupcodes, users } from '@milemoto/types';
import type { MfaBackupCodesResponseDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { decryptFromBlob } from '../../utils/crypto.js';
import { generateBackupCodes, verifyTotp } from '../../utils/totp.js';
import { backupHash, revokeAllTrustedDevices } from '../../routes/helpers/auth.helpers.js';
import { toUserId } from '../auth/shared.js';

export async function disableMfa(userId: string, password: string, code: string) {
  const userIdNum = toUserId(userId);

  const [u] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      mfaEnabled: users.mfaEnabled,
      mfaSecretEnc: users.mfaSecretEnc,
    })
    .from(users)
    .where(eq(users.id, userIdNum))
    .limit(1);
  if (!u) throw httpError(404, 'UserNotFound', 'User not found');
  if (!Boolean(u.mfaEnabled)) throw httpError(400, 'MfaNotEnabled', 'MFA not enabled');

  const passOk = await argon2.verify(u.passwordHash, password);
  if (!passOk) throw httpError(400, 'InvalidPassword', 'Invalid password');

  let ok = false;
  if (/^\d{6}$/.test(code)) {
    if (!u.mfaSecretEnc) throw httpError(400, 'MfaMisconfigured', 'MFA misconfigured');
    const secretRaw = decryptFromBlob(u.mfaSecretEnc);
    ok = verifyTotp(code, secretRaw);
  }
  if (!ok) {
    const rawInput = code.toUpperCase().trim();
    const pretty = rawInput.length > 4 ? `${rawInput.slice(0, 4)}-${rawInput.slice(4)}` : rawInput;
    const candidates = [backupHash(rawInput), backupHash(pretty)];
    for (const h of candidates) {
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
        break;
      }
    }
  }
  if (!ok) throw httpError(400, 'InvalidCode', 'Invalid 2FA or backup code');

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ mfaEnabled: false, mfaSecretEnc: null })
      .where(eq(users.id, userIdNum));

    await tx.delete(mfabackupcodes).where(eq(mfabackupcodes.userId, userIdNum));
  });

  await revokeAllTrustedDevices(String(userId));
  return { ok: true };
}

export async function regenerateBackupCodes(userId: string) {
  const userIdNum = toUserId(userId);

  await db
    .update(mfabackupcodes)
    .set({ usedAt: new Date() })
    .where(and(eq(mfabackupcodes.userId, userIdNum), isNull(mfabackupcodes.usedAt)));

  const { codes, hashes } = generateBackupCodes(10);
  if (hashes.length) {
    await db.insert(mfabackupcodes).values(
      hashes.map((h) => ({
        userId: userIdNum,
        codeHash: h,
      }))
    );
  }
  return { ok: true, backupCodes: codes } as MfaBackupCodesResponseDto;
}

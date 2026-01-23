import crypto from 'crypto';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { phoneverifications, users } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { dbNow } from '../../db/time.js';
import { env } from '../../config/env.js';
import { httpError } from '../../utils/error.js';
import { sha256 } from '../../utils/crypto.js';
import { sendSmsMessage } from '../smsGateway.service.js';
import { getFeatureTogglesSettings } from '../siteSettings.service.js';
import { toUserId } from './shared.js';

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function generateCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export async function startPhoneVerification(userId: string) {
  const toggles = await getFeatureTogglesSettings();
  if (!toggles.phoneVerificationEnabled) {
    throw httpError(400, 'PhoneVerificationDisabled', 'Phone verification is disabled.');
  }

  const userIdNum = toUserId(userId);
  const [user] = await db
    .select({
      id: users.id,
      phone: users.phone,
      phoneVerifiedAt: users.phoneVerifiedAt,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, userIdNum))
    .limit(1);

  if (!user) throw httpError(404, 'UserNotFound', 'User not found');
  const phone = user.phone ?? null;
  if (!phone) {
    throw httpError(400, 'PhoneMissing', 'Add a phone number before verifying it.');
  }
  if (user.status === 'blocked') {
    throw httpError(403, 'UserBlocked', 'This user is blocked and cannot receive SMS.');
  }

  if (user.phoneVerifiedAt) {
    return { ok: true, phoneVerifiedAt: toIso(user.phoneVerifiedAt) };
  }

  const code = generateCode();
  const now = await dbNow();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx.delete(phoneverifications).where(eq(phoneverifications.userId, userIdNum));
    await tx.insert(phoneverifications).values({
      userId: userIdNum,
      phone,
      codeHash: sha256(code),
      attempts: 0,
      expiresAt,
      usedAt: null,
    });
  });

  const message = `Your MileMoto verification code is ${code}. It expires in 10 minutes.`;
  await sendSmsMessage({ toNumber: phone, message });

  return { ok: true, expiresAt: expiresAt.toISOString() };
}

export async function verifyPhoneCode(userId: string, code: string) {
  const maxAttempts = env.PHONE_VERIFY_MAX_ATTEMPTS;
  const userIdNum = toUserId(userId);
  const [user] = await db
    .select({ phone: users.phone, phoneVerifiedAt: users.phoneVerifiedAt })
    .from(users)
    .where(eq(users.id, userIdNum))
    .limit(1);

  if (!user) throw httpError(404, 'UserNotFound', 'User not found');
  if (!user.phone) {
    throw httpError(400, 'PhoneMissing', 'Add a phone number before verifying it.');
  }
  if (user.phoneVerifiedAt) {
    return { ok: true, phoneVerifiedAt: toIso(user.phoneVerifiedAt) };
  }

  const [verification] = await db
    .select({
      id: phoneverifications.id,
      phone: phoneverifications.phone,
      codeHash: phoneverifications.codeHash,
      attempts: phoneverifications.attempts,
    })
    .from(phoneverifications)
    .where(
      and(
        eq(phoneverifications.userId, userIdNum),
        isNull(phoneverifications.usedAt),
        gt(phoneverifications.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!verification) {
    throw httpError(
      400,
      'PhoneVerificationExpired',
      'Verification code expired. Request a new one.'
    );
  }
  if (verification.phone !== user.phone) {
    throw httpError(
      400,
      'PhoneVerificationMismatch',
      'Phone number changed. Request a new verification code.'
    );
  }
  if (verification.attempts >= maxAttempts) {
    throw httpError(
      400,
      'PhoneVerificationAttemptsExceeded',
      'Too many attempts. Request a new verification code.'
    );
  }
  if (sha256(code) !== verification.codeHash) {
    await db
      .update(phoneverifications)
      .set({ attempts: sql`${phoneverifications.attempts} + 1` })
      .where(eq(phoneverifications.id, verification.id));
    throw httpError(400, 'PhoneVerificationInvalid', 'Invalid verification code.');
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(phoneverifications)
      .set({ usedAt: now })
      .where(eq(phoneverifications.id, verification.id));
    await tx.update(users).set({ phoneVerifiedAt: now }).where(eq(users.id, userIdNum));
  });

  return { ok: true, phoneVerifiedAt: now.toISOString() };
}

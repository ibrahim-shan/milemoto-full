import argon2 from 'argon2';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { passwordresets, sessions, users } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { randToken, sha256 } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import { dbNow } from '../../db/time.js';
import { revokeAllTrustedDevices } from '../../routes/helpers/auth.helpers.js';
import { toUserId } from './shared.js';
import { sendSmsMessage } from '../smsGateway.service.js';

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const userIdNum = toUserId(userId);

  const [u] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userIdNum))
    .limit(1);

  if (!u || !u.passwordHash) {
    throw httpError(404, 'UserNotFound', 'User not found');
  }

  const ok = await argon2.verify(u.passwordHash, oldPassword);
  if (!ok) {
    throw httpError(401, 'InvalidPassword', 'Invalid current password');
  }

  const matchesExisting = await argon2.verify(u.passwordHash, newPassword);
  if (matchesExisting) {
    throw httpError(
      400,
      'PasswordReuse',
      'New password must be different from the current password'
    );
  }

  const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userIdNum));

  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, userIdNum));
  await revokeAllTrustedDevices(String(userId));
}

export async function requestPasswordReset(email: string) {
  const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (u) {
    const token = randToken(32);
    const hash = sha256(token);
    const now = await dbNow();
    const exp = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);

    await db.transaction(async (tx) => {
      await tx
        .update(passwordresets)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordresets.userId, Number(u.id)), isNull(passwordresets.usedAt)));

      await tx.insert(passwordresets).values({
        userId: Number(u.id),
        tokenHash: hash,
        expiresAt: exp,
        usedAt: null,
      });
    });

    const resetUrl = `${env.FRONTEND_BASE_URL}/reset-password?token=${token}`;

    try {
      const { sendPasswordResetEmail } = await import('../emailService.js');
      await sendPasswordResetEmail(email.toLowerCase(), resetUrl);
      if (env.NODE_ENV === 'development') {
        logger.info({ resetUrl }, 'Password reset link sent');
      }
    } catch (emailError) {
      logger.error({ err: emailError, email }, 'Failed to send password reset email');
    }

    await revokeAllTrustedDevices(String(u.id));
  }

  return { ok: true };
}

export async function requestPasswordResetByPhone(phone: string) {
  const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

  const [u] = await db
    .select({ id: users.id, phone: users.phone })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (u) {
    const token = randToken(32);
    const hash = sha256(token);
    const now = await dbNow();
    const exp = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);

    await db.transaction(async (tx) => {
      await tx
        .update(passwordresets)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordresets.userId, Number(u.id)), isNull(passwordresets.usedAt)));

      await tx.insert(passwordresets).values({
        userId: Number(u.id),
        tokenHash: hash,
        expiresAt: exp,
        usedAt: null,
      });
    });

    const resetUrl = `${env.FRONTEND_BASE_URL}/reset-password?token=${token}`;
    const message = `Reset your MileMoto password: ${resetUrl}`;

    try {
      await sendSmsMessage({ toNumber: u.phone ?? phone, message });
      if (env.NODE_ENV === 'development') {
        logger.info({ resetUrl }, 'Password reset SMS sent');
      }
    } catch (smsError) {
      logger.error({ err: smsError, phone }, 'Failed to send password reset SMS');
    }

    await revokeAllTrustedDevices(String(u.id));
  }

  return { ok: true };
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const hash = sha256(token);
  const [r] = await db
    .select({ id: passwordresets.id, userId: passwordresets.userId })
    .from(passwordresets)
    .where(
      and(
        eq(passwordresets.tokenHash, hash),
        isNull(passwordresets.usedAt),
        gt(passwordresets.expiresAt, new Date())
      )
    )
    .limit(1);
  if (!r) throw httpError(400, 'InvalidToken', 'Invalid or expired token');

  const [existing] = await db
    .select({ email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, Number(r.userId)))
    .limit(1);
  const userEmail = existing?.email ?? null;

  if (existing?.passwordHash) {
    const matchesExisting = await argon2.verify(existing.passwordHash, newPassword);
    if (matchesExisting) {
      throw httpError(
        400,
        'PasswordReuse',
        'New password must be different from the current password'
      );
    }
  }

  const pwHash = await argon2.hash(newPassword, { type: argon2.argon2id });

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash: pwHash })
      .where(eq(users.id, Number(r.userId)));
    await tx
      .update(passwordresets)
      .set({ usedAt: new Date() })
      .where(eq(passwordresets.id, Number(r.id)));
    await tx
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.userId, Number(r.userId)));
  });
  await revokeAllTrustedDevices(String(r.userId));

  return { ok: true, email: userEmail };
}

import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import { emailverifications, users } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { sha256 } from '../../utils/crypto.js';
import {
  revokeAllTrustedDevices,
  sendNewVerificationEmail,
} from '../../routes/helpers/auth.helpers.js';
import { toUserId } from './shared.js';

export async function verifyEmailToken(token: string) {
  const hash = sha256(token);

  const [verification] = await db
    .select({
      id: emailverifications.id,
      userId: emailverifications.userId,
      pendingEmail: emailverifications.email,
      currentEmail: users.email,
    })
    .from(emailverifications)
    .innerJoin(users, eq(users.id, emailverifications.userId))
    .where(
      and(
        eq(emailverifications.tokenHash, hash),
        isNull(emailverifications.usedAt),
        gt(emailverifications.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!verification) {
    throw httpError(400, 'InvalidToken', 'Invalid or expired token');
  }

  const nextEmail = (verification.pendingEmail ?? verification.currentEmail).toLowerCase();

  await db.transaction(async (tx) => {
    await tx
      .update(emailverifications)
      .set({ usedAt: new Date() })
      .where(eq(emailverifications.id, Number(verification.id)));

    const userUpdate: Partial<typeof users.$inferInsert> = { emailVerifiedAt: new Date() };
    if (
      verification.pendingEmail &&
      verification.pendingEmail.toLowerCase() !== verification.currentEmail.toLowerCase()
    ) {
      userUpdate.email = nextEmail;
    }
    await tx
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, Number(verification.userId)));
  });

  await revokeAllTrustedDevices(String(verification.userId));

  return { ok: true, email: nextEmail ?? null };
}

export async function resendVerificationEmail(email: string) {
  const [u] = await db
    .select({ id: users.id, emailVerifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (u && !u.emailVerifiedAt) {
    void sendNewVerificationEmail(String(u.id), email.toLowerCase());
  }

  if (u) {
    await revokeAllTrustedDevices(String(u.id));
  }

  return { ok: true };
}

export async function startEmailChange(userId: string, nextEmail: string) {
  const userIdNum = toUserId(userId);
  const normalized = nextEmail.toLowerCase().trim();

  const [current] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userIdNum))
    .limit(1);

  if (!current) {
    throw httpError(404, 'UserNotFound', 'User not found');
  }

  if (current.email.toLowerCase() === normalized) {
    return { ok: true };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, normalized), ne(users.id, userIdNum)))
    .limit(1);

  if (existing) {
    throw httpError(409, 'EmailInUse', 'Email address is already in use.');
  }

  await sendNewVerificationEmail(String(current.id), normalized);
  return { ok: true };
}

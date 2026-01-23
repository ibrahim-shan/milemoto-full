import { and, eq, gt, isNull } from 'drizzle-orm';
import { emailverifications, phoneverifications, users } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { toUserId } from './shared.js';

export async function getUserProfile(userId: string) {
  const userIdNum = toUserId(userId);

  const [u] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      mfaEnabled: users.mfaEnabled,
      phoneVerifiedAt: users.phoneVerifiedAt,
      pendingEmail: emailverifications.email,
    })
    .from(users)
    .leftJoin(
      emailverifications,
      and(
        eq(emailverifications.userId, users.id),
        isNull(emailverifications.usedAt),
        gt(emailverifications.expiresAt, new Date())
      )
    )
    .where(eq(users.id, userIdNum))
    .limit(1);
  if (!u) throw httpError(404, 'UserNotFound', 'User not found');

  return {
    id: String(u.id),
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    pendingEmail: u.pendingEmail ?? null,
    role: u.role,
    status: u.status,
    mfaEnabled: Boolean(u.mfaEnabled),
    phoneVerifiedAt: u.phoneVerifiedAt
      ? u.phoneVerifiedAt instanceof Date
        ? u.phoneVerifiedAt.toISOString()
        : String(u.phoneVerifiedAt)
      : null,
  };
}

export async function updateUserProfile(
  userId: string,
  data: { fullName: string; phone?: string | null | undefined }
) {
  const userIdNum = toUserId(userId);
  const phoneVal = data.phone === undefined ? undefined : data.phone;

  const updates: Partial<typeof users.$inferInsert> = { fullName: data.fullName };
  if (phoneVal !== undefined) {
    const [current] = await db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, userIdNum))
      .limit(1);
    const prevPhone = current?.phone ?? null;
    const nextPhone = phoneVal ?? null;
    if (prevPhone !== nextPhone) {
      updates.phoneVerifiedAt = null;
      await db.delete(phoneverifications).where(eq(phoneverifications.userId, userIdNum));
    }
    updates.phone = phoneVal;
  }

  await db.update(users).set(updates).where(eq(users.id, userIdNum));

  return getUserProfile(userId);
}

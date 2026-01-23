import argon2 from 'argon2';
import crypto from 'crypto';
import { eq, sql } from 'drizzle-orm';
import type { UserAuthData } from '@milemoto/types';
import { users } from '@milemoto/types';
import { db } from '../../../db/drizzle.js';
import type { VerifiedGoogleIdentity } from './types.js';

function toUserAuthData(row: {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'blocked';
  mfaEnabled: boolean;
  emailVerifiedAt: Date | string | null;
  phoneVerifiedAt?: Date | string | null;
}): UserAuthData {
  return {
    id: Number(row.id),
    fullName: row.fullName,
    email: row.email,
    phone: row.phone ?? null,
    role: row.role,
    status: row.status,
    mfaEnabled: row.mfaEnabled ? 1 : 0,
    emailVerifiedAt:
      row.emailVerifiedAt === null
        ? null
        : row.emailVerifiedAt instanceof Date
          ? row.emailVerifiedAt.toISOString()
          : String(row.emailVerifiedAt),
    phoneVerifiedAt:
      row.phoneVerifiedAt === null
        ? null
        : row.phoneVerifiedAt instanceof Date
          ? row.phoneVerifiedAt.toISOString()
          : row.phoneVerifiedAt
            ? String(row.phoneVerifiedAt)
            : null,
  };
}

export async function resolveOrCreateUserFromGoogle(
  identity: VerifiedGoogleIdentity
): Promise<UserAuthData | null> {
  const [bySub] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      mfaEnabled: users.mfaEnabled,
      emailVerifiedAt: users.emailVerifiedAt,
      phoneVerifiedAt: users.phoneVerifiedAt,
    })
    .from(users)
    .where(eq(users.googleSub, identity.gsub))
    .limit(1);

  let u: UserAuthData | undefined = bySub ? toUserAuthData(bySub) : undefined;

  if (!u && identity.email) {
    const [existingRow] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        googleSub: users.googleSub,
        mfaEnabled: users.mfaEnabled,
        emailVerifiedAt: users.emailVerifiedAt,
        phoneVerifiedAt: users.phoneVerifiedAt,
      })
      .from(users)
      .where(eq(users.email, identity.email))
      .limit(1);

    const existing = existingRow ? toUserAuthData(existingRow) : undefined;
    if (existing) {
      await db
        .update(users)
        .set({
          googleSub: identity.gsub,
          emailVerifiedAt: sql`COALESCE(${users.emailVerifiedAt}, ${identity.verifiedAt})`,
        })
        .where(eq(users.id, existing.id));
      u = {
        ...existing,
        emailVerifiedAt:
          existing.emailVerifiedAt ??
          (identity.verifiedAt ? identity.verifiedAt.toISOString() : null),
      } as UserAuthData;
    }
  }

  if (!u) {
    const randomPw = crypto.randomBytes(16).toString('hex');
    const hash = await argon2.hash(randomPw, { type: argon2.argon2id });
    const ins = await db.insert(users).values({
      fullName: identity.name,
      email: identity.email,
      passwordHash: hash,
      role: 'user',
      status: 'active',
      emailVerifiedAt: identity.verifiedAt,
      googleSub: identity.gsub,
    });
    const userId =
      ins && typeof ins === 'object' && 'insertId' in ins
        ? Number((ins as { insertId: number }).insertId)
        : NaN;
    if (!Number.isFinite(userId)) return null;
    u = {
      id: userId,
      fullName: identity.name,
      email: identity.email,
      phone: null,
      role: 'user',
      status: 'active',
      mfaEnabled: 0,
      emailVerifiedAt: identity.verifiedAt ? identity.verifiedAt.toISOString() : null,
    };
  }

  return u ?? null;
}

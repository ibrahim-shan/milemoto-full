import argon2 from 'argon2';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../src/db/drizzle.js';
import { mfaloginchallenges, sessions, users } from '@milemoto/types';

export type TestUser = {
  id: number;
  email: string;
  password: string;
};

export async function ensureEmailVerifiedAtNullable() {
  await db.execute(sql`ALTER TABLE users MODIFY emailVerifiedAt timestamp NULL`);
}

export async function createUser(params: {
  email: string;
  password: string;
  verified: boolean;
  mfaEnabled?: boolean;
}) {
  const hash = await argon2.hash(params.password, { type: argon2.argon2id });
  const inserted = await db
    .insert(users)
    .values({
      fullName: 'Test User',
      email: params.email.toLowerCase(),
      passwordHash: hash,
      role: 'user',
      status: 'active',
      mfaEnabled: params.mfaEnabled ?? false,
      emailVerifiedAt: params.verified ? new Date() : null,
    })
    .$returningId();

  const id = inserted[0]?.id ? Number(inserted[0].id) : NaN;
  if (!Number.isFinite(id)) throw new Error('Failed to create test user');
  if (!params.verified) {
    await db.update(users).set({ emailVerifiedAt: null }).where(eq(users.id, id));
  }
  return { id, email: params.email, password: params.password } satisfies TestUser;
}

export function uniqueEmail(tag: string) {
  const nonce = Date.now().toString(36);
  return `test+${tag}.${nonce}@milemoto.local`;
}

export async function cleanupUsers(usersToCleanup: TestUser[]) {
  const ids = usersToCleanup.map((u) => u.id);
  if (!ids.length) return;
  await db.delete(mfaloginchallenges).where(inArray(mfaloginchallenges.userId, ids));
  await db.delete(sessions).where(inArray(sessions.userId, ids));
  await db.delete(users).where(inArray(users.id, ids));
}

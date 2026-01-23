import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { emailverifications, users } from '@milemoto/types';
import { randToken, sha256 } from '../../src/utils/crypto.js';
import { dbNow } from '../../src/db/time.js';
import {
  cleanupUsers,
  createUser,
  ensureEmailVerifiedAtNullable,
  uniqueEmail,
  type TestUser,
} from './helpers.js';

const testUsers: TestUser[] = [];

beforeAll(async () => {
  await ensureEmailVerifiedAtNullable();
  testUsers.push(
    await createUser({
      email: uniqueEmail('emailverify'),
      password: 'Password123!',
      verified: false,
    })
  );
});

afterAll(async () => {
  const ids = testUsers.map((u) => u.id);
  if (ids.length) {
    await db.delete(emailverifications).where(inArray(emailverifications.userId, ids));
  }
  await cleanupUsers(testUsers);
});

describe('auth email verification', () => {
  it('verifies email with a valid token', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Email verification test user missing');

    const token = randToken(32);
    const hash = sha256(token);
    const now = await dbNow();
    const exp = new Date(now.getTime() + 10 * 60 * 1000);

    await db.insert(emailverifications).values({
      userId: user.id,
      email: null,
      tokenHash: hash,
      expiresAt: exp,
      usedAt: null,
    });

    const res = await request(app).post('/api/v1/auth/verify-email').send({ token });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });

    const [row] = await db
      .select({ emailVerifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    expect(row?.emailVerifiedAt).not.toBeNull();
  });

  it('resends verification email for unverified user', async () => {
    const email = uniqueEmail('resend');
    const user = await createUser({
      email,
      password: 'Password123!',
      verified: false,
    });
    testUsers.push(user);

    const res = await request(app).post('/api/v1/auth/verify-email/resend').send({ email });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });
});

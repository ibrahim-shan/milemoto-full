import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, inArray, isNull } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { emailverifications } from '@milemoto/types';
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
      email: uniqueEmail('emailinvalid'),
      password: 'Password123!',
      verified: false,
    })
  );
});

afterAll(async () => {
  const ids = testUsers.map((u) => u.id);
  if (ids.length) {
    await db
      .delete(emailverifications)
      .where(and(inArray(emailverifications.userId, ids), isNull(emailverifications.usedAt)));
  }
  await cleanupUsers(testUsers);
});

describe('auth email verification failures', () => {
  it('rejects invalid token', async () => {
    const res = await request(app).post('/api/v1/auth/verify-email').send({
      token: 'invalid-token',
    });
    expect(res.status).toBe(400);
  });

  it('rejects expired token', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Email verification test user missing');

    const token = randToken(32);
    const hash = sha256(token);
    const now = await dbNow();
    const exp = new Date(now.getTime() - 60 * 1000);

    await db.insert(emailverifications).values({
      userId: user.id,
      email: null,
      tokenHash: hash,
      expiresAt: exp,
      usedAt: null,
    });

    const res = await request(app).post('/api/v1/auth/verify-email').send({ token });
    expect(res.status).toBe(400);
  });
});

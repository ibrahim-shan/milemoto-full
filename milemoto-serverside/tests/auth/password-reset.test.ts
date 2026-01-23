import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { passwordresets, users } from '@milemoto/types';
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
  const user = await createUser({
    email: uniqueEmail('reset'),
    password: 'Password123!',
    verified: true,
  });
  await db.update(users).set({ phone: '+15555550100' }).where(eq(users.id, user.id));
  testUsers.push(user);
});

afterAll(async () => {
  const ids = testUsers.map((u) => u.id);
  if (ids.length) {
    await db
      .delete(passwordresets)
      .where(and(inArray(passwordresets.userId, ids), isNull(passwordresets.usedAt)));
  }
  await cleanupUsers(testUsers);
});

describe('auth password reset', () => {
  it('requests password reset by email', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Reset test user missing');

    const res = await request(app).post('/api/v1/auth/forgot').send({
      email: user.email,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  it('requests password reset by phone', async () => {
    const res = await request(app).post('/api/v1/auth/forgot/phone').send({
      phone: '+15555550100',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  it('resets password with valid token', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Reset test user missing');

    const token = randToken(32);
    const hash = sha256(token);
    const now = await dbNow();
    const exp = new Date(now.getTime() + 10 * 60 * 1000);

    await db.insert(passwordresets).values({
      userId: user.id,
      tokenHash: hash,
      expiresAt: exp,
      usedAt: null,
    });

    const res = await request(app).post('/api/v1/auth/reset').send({
      token,
      password: 'Password456!',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: 'Password456!',
      remember: false,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('accessToken');
  });
});

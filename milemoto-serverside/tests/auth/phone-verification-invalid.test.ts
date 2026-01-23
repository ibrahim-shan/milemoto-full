import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { phoneverifications, users } from '@milemoto/types';
import { sha256 } from '../../src/utils/crypto.js';
import { dbNow } from '../../src/db/time.js';
import { env } from '../../src/config/env.js';
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
    email: uniqueEmail('phoneinvalid'),
    password: 'Password123!',
    verified: true,
  });
  await db.update(users).set({ phone: '+15555550300' }).where(eq(users.id, user.id));
  testUsers.push(user);
});

afterAll(async () => {
  const ids = testUsers.map((u) => u.id);
  if (ids.length) {
    await db
      .delete(phoneverifications)
      .where(and(inArray(phoneverifications.userId, ids), isNull(phoneverifications.usedAt)));
  }
  await cleanupUsers(testUsers);
});

describe('auth phone verification failures', () => {
  it('rejects when attempts exceeded', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Phone verification test user missing');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });

    const accessToken = loginRes.body?.accessToken as string | undefined;
    if (!accessToken) throw new Error('Missing access token');

    const now = await dbNow();
    const exp = new Date(now.getTime() + 10 * 60 * 1000);
    const maxAttempts = Number(env.PHONE_VERIFY_MAX_ATTEMPTS);

    const code = String((Date.now() % 900000) + 100000);
    await db.insert(phoneverifications).values({
      userId: user.id,
      phone: '+15555550300',
      codeHash: sha256(code),
      attempts: maxAttempts,
      expiresAt: exp,
      usedAt: null,
    });

    const res = await request(app)
      .post('/api/v1/auth/phone/verify/confirm')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code });

    expect(res.status).toBe(400);
  });
});

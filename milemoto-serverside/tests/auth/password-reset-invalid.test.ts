import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, inArray, isNull } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { passwordresets } from '@milemoto/types';
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
      email: uniqueEmail('reset-invalid'),
      password: 'Password123!',
      verified: true,
    })
  );
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

describe('auth password reset invalid cases', () => {
  it('rejects reuse of a reset token', async () => {
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

    const res1 = await request(app).post('/api/v1/auth/reset').send({
      token,
      password: 'Password456!',
    });
    expect(res1.status).toBe(200);

    const res2 = await request(app).post('/api/v1/auth/reset').send({
      token,
      password: 'Password789!',
    });
    expect(res2.status).toBe(400);
    expect(res2.body?.code).toBe('InvalidToken');
  });

  it('rejects expired reset tokens', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Reset test user missing');

    const token = randToken(32);
    const hash = sha256(token);
    const exp = new Date(Date.now() - 60 * 1000);

    await db.insert(passwordresets).values({
      userId: user.id,
      tokenHash: hash,
      expiresAt: exp,
      usedAt: null,
    });

    const res = await request(app).post('/api/v1/auth/reset').send({
      token,
      password: 'Password000!',
    });
    expect(res.status).toBe(400);
    expect(res.body?.code).toBe('InvalidToken');
  });
});

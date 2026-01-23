import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { users } from '@milemoto/types';
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
  const inactive = await createUser({
    email: uniqueEmail('inactive'),
    password: 'Password123!',
    verified: true,
  });
  const blocked = await createUser({
    email: uniqueEmail('blocked'),
    password: 'Password123!',
    verified: true,
  });

  await db.update(users).set({ status: 'inactive' }).where(eq(users.id, inactive.id));
  await db.update(users).set({ status: 'blocked' }).where(eq(users.id, blocked.id));

  testUsers.push(inactive, blocked);
});

afterAll(async () => {
  await cleanupUsers(testUsers);
});

describe('auth login status', () => {
  it('rejects login for inactive users', async () => {
    const user = testUsers.find((u) => u.email.includes('inactive'));
    if (!user) throw new Error('Inactive user missing');

    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });

    expect(res.status).toBe(401);
  });

  it('rejects login for blocked users', async () => {
    const user = testUsers.find((u) => u.email.includes('blocked'));
    if (!user) throw new Error('Blocked user missing');

    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });

    expect(res.status).toBe(401);
  });
});

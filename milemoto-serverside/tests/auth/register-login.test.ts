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
  testUsers.push(
    await createUser({
      email: uniqueEmail('verified'),
      password: 'Password123!',
      verified: true,
    })
  );
  testUsers.push(
    await createUser({
      email: uniqueEmail('unverified'),
      password: 'Password123!',
      verified: false,
    })
  );
});

afterAll(async () => {
  await cleanupUsers(testUsers);
});

describe('auth register/login', () => {
  it('registers a new user', async () => {
    const email = uniqueEmail('register');
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Register Test',
      email,
      password: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true });

    await db.delete(users).where(eq(users.email, email.toLowerCase()));
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: 'nobody@example.com',
      password: 'badpass1',
      remember: false,
    });

    expect(res.status).toBe(401);
  });

  it('rejects unverified email login', async () => {
    const unverified = testUsers.find((u) => u.email.includes('unverified'));
    if (!unverified) throw new Error('Unverified test user missing');

    await db.update(users).set({ emailVerifiedAt: null }).where(eq(users.id, unverified.id));
    const [fresh] = await db
      .select({ emailVerifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.id, unverified.id))
      .limit(1);
    if (!fresh || fresh.emailVerifiedAt !== null) {
      throw new Error('Failed to force unverified user state for test');
    }

    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: unverified.email,
      password: unverified.password,
      remember: false,
    });

    expect(res.status).toBe(403);
  });

  it('logs in a verified user and sets refresh cookie', async () => {
    const verified = testUsers.find((u) => u.email.includes('verified'));
    if (!verified) throw new Error('Verified test user missing');

    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: verified.email,
      password: verified.password,
      remember: false,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.headers['set-cookie']).toBeTruthy();
  });
});

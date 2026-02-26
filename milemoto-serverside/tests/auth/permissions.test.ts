import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
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
      email: uniqueEmail('perms'),
      password: 'Password123!',
      verified: true,
    })
  );
});

afterAll(async () => {
  await cleanupUsers(testUsers);
});

describe('auth permissions', () => {
  it('returns permissions array for authenticated user', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Permissions test user missing');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });

    const accessToken = loginRes.body?.accessToken as string | undefined;
    if (!accessToken) throw new Error('Missing access token');

    const res = await request(app)
      .get('/api/v1/auth/permissions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('permissions');
    expect(Array.isArray(res.body.permissions)).toBe(true);
  });

  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/auth/permissions');
    expect(res.status).toBe(401);
  });
});

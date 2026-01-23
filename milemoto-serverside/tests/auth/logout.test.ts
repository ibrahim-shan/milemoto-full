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
      email: uniqueEmail('logout'),
      password: 'Password123!',
      verified: true,
    })
  );
});

afterAll(async () => {
  await cleanupUsers(testUsers);
});

describe('auth logout', () => {
  it('logs out and clears refresh cookie', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Logout test user missing');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });

    const cookies = loginRes.headers['set-cookie'];
    if (!cookies) throw new Error('Missing refresh cookie');

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies);

    expect(logoutRes.status).toBe(204);
  });
});

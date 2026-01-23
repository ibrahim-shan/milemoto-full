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
      email: uniqueEmail('refresh'),
      password: 'Password123!',
      verified: true,
    })
  );
});

afterAll(async () => {
  await cleanupUsers(testUsers);
});

describe('auth refresh', () => {
  it('refreshes a session using refresh cookie', async () => {
    const verified = testUsers[0];
    if (!verified) throw new Error('Verified test user missing');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      identifier: verified.email,
      password: verified.password,
      remember: false,
    });

    const cookies = loginRes.headers['set-cookie'];
    if (!cookies) {
      throw new Error('Missing refresh cookie');
    }

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty('accessToken');
  });
});

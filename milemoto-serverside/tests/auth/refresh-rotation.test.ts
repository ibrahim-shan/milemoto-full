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
      email: uniqueEmail('refresh-rotation'),
      password: 'Password123!',
      verified: true,
    })
  );
});

afterAll(async () => {
  await cleanupUsers(testUsers);
});

describe('auth refresh rotation', () => {
  it('rejects reuse of an old refresh token after rotation', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Rotation test user missing');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });
    const loginCookies = loginRes.headers['set-cookie'];
    if (!loginCookies) throw new Error('Missing refresh cookie');

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', loginCookies);
    expect(refreshRes.status).toBe(200);

    const rotatedCookies = refreshRes.headers['set-cookie'];
    if (!rotatedCookies) throw new Error('Missing rotated refresh cookie');

    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', loginCookies);
    expect(reuseRes.status).toBe(401);

    const latestRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotatedCookies);
    expect(latestRes.status).toBe(200);
    expect(latestRes.body).toHaveProperty('accessToken');
  });
});

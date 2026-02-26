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
      email: uniqueEmail('change'),
      password: 'Password123!',
      verified: true,
    })
  );
});

afterAll(async () => {
  await cleanupUsers(testUsers);
});

describe('auth change password', () => {
  it('changes password for authenticated user', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Change password test user missing');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });

    const accessToken = loginRes.body?.accessToken as string | undefined;
    if (!accessToken) throw new Error('Missing access token');

    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        oldPassword: user.password,
        newPassword: 'Password456!',
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });

    const loginRes2 = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: 'Password456!',
      remember: false,
    });
    expect(loginRes2.status).toBe(200);
    expect(loginRes2.body).toHaveProperty('accessToken');
  });

  it('rejects change-password with wrong old password', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Missing test user');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: 'Password456!', // password after the previous test changed it
      remember: false,
    });

    const accessToken = loginRes.body?.accessToken as string | undefined;
    if (!accessToken) throw new Error('Missing access token');

    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        oldPassword: 'WrongPassword999!',
        newPassword: 'NewPassword123!',
      });

    expect(res.status).toBe(401);
  });

  it('rejects change-password without authentication', async () => {
    const res = await request(app).post('/api/v1/auth/change-password').send({
      oldPassword: 'Password123!',
      newPassword: 'Password456!',
    });
    expect(res.status).toBe(401);
  });
});

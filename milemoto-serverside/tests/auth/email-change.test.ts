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
      email: uniqueEmail('emailchange'),
      password: 'Password123!',
      verified: true,
    })
  );
});

afterAll(async () => {
  await cleanupUsers(testUsers);
});

describe('auth email change', () => {
  it('starts email change flow for authenticated user', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Email change test user missing');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });

    const accessToken = loginRes.body?.accessToken as string | undefined;
    if (!accessToken) throw new Error('Missing access token');

    const newEmail = uniqueEmail('emailchange-new');
    const res = await request(app)
      .post('/api/v1/auth/email/change/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: newEmail });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/v1/auth/email/change/start')
      .send({ email: uniqueEmail('unauth') });
    expect(res.status).toBe(401);
  });

  it('rejects invalid email format', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Email change test user missing');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });
    const accessToken = loginRes.body?.accessToken as string | undefined;
    if (!accessToken) throw new Error('Missing access token');

    const res = await request(app)
      .post('/api/v1/auth/email/change/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'not-a-valid-email' });

    expect(res.status).toBe(400);
    expect(res.body?.code).toBe('ValidationError');
  });
});

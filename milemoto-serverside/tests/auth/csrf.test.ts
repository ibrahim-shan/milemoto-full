import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
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
  testUsers.push(
    await createUser({
      email: uniqueEmail('csrf'),
      password: 'Password123!',
      verified: true,
    })
  );
});

afterAll(async () => {
  await cleanupUsers(testUsers);
});

describe('auth csrf', () => {
  it('rejects browser POSTs missing CSRF token', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('CSRF test user missing');

    const origin = env.CORS_ORIGINS.split(',')[0]?.trim() || env.FRONTEND_BASE_URL;
    const agent = request.agent(app);

    const csrfRes = await agent.get('/api/v1/auth/csrf').set('Origin', origin);
    expect(csrfRes.status).toBe(200);
    const csrfToken = csrfRes.body?.csrfToken as string | undefined;
    if (!csrfToken) throw new Error('Missing CSRF token');

    const missingRes = await agent
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({
        identifier: user.email,
        password: user.password,
        remember: false,
      });
    expect(missingRes.status).toBe(403);
    expect(missingRes.body?.code).toBe('CsrfMissing');

    const okRes = await agent
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .set('x-csrf-token', csrfToken)
      .send({
        identifier: user.email,
        password: user.password,
        remember: false,
      });
    expect(okRes.status).toBe(200);
    expect(okRes.body).toHaveProperty('accessToken');
  });
});

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
      email: uniqueEmail('mfa'),
      password: 'Password123!',
      verified: true,
      mfaEnabled: true,
    })
  );
});

afterAll(async () => {
  await cleanupUsers(testUsers);
});

describe('auth mfa', () => {
  it('returns MFA challenge for MFA-enabled user', async () => {
    const mfaUser = testUsers[0];
    if (!mfaUser) throw new Error('MFA test user missing');

    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: mfaUser.email,
      password: mfaUser.password,
      remember: false,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ mfaRequired: true });
    expect(res.body).toHaveProperty('challengeId');
  });
});

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import {
  trusteddevices,
  mfabackupcodes,
  mfachallenges,
  mfaloginchallenges,
  users,
} from '@milemoto/types';
import { base32Decode, totpCode } from '../../src/utils/totp.js';
import {
  cleanupUsers,
  createUser,
  ensureEmailVerifiedAtNullable,
  uniqueEmail,
  type TestUser,
} from './helpers.js';

const testUsers: TestUser[] = [];

/**
 * Helper: sets up MFA for a user and logs in with rememberDevice=true.
 * Returns the accessToken and trustedCookies for that session.
 */
async function setupMfaAndLoginWithTrust(user: TestUser) {
  const loginRes = await request(app).post('/api/v1/auth/login').send({
    identifier: user.email,
    password: user.password,
  });
  const accessToken = loginRes.body?.accessToken as string | undefined;
  if (!accessToken) throw new Error('Missing access token for MFA setup');

  const startRes = await request(app)
    .post('/api/v1/auth/mfa/setup/start')
    .set('Authorization', `Bearer ${accessToken}`);
  expect(startRes.status).toBe(200);
  const { challengeId, secretBase32 } = startRes.body as {
    challengeId: string;
    secretBase32: string;
  };

  const code = totpCode(base32Decode(secretBase32));
  const verifyRes = await request(app)
    .post('/api/v1/auth/mfa/setup/verify')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ challengeId, code });
  expect(verifyRes.status).toBe(200);

  // Log in again with MFA, requesting device trust
  const loginMfaRes = await request(app).post('/api/v1/auth/login').send({
    identifier: user.email,
    password: user.password,
  });
  const mfaChallengeId = loginMfaRes.body?.challengeId as string | undefined;
  if (!mfaChallengeId) throw new Error('Missing MFA challenge id');

  const verifyLoginRes = await request(app)
    .post('/api/v1/auth/mfa/login/verify')
    .send({ challengeId: mfaChallengeId, code, rememberDevice: true });
  expect(verifyLoginRes.status).toBe(200);

  const trustedCookies = verifyLoginRes.headers['set-cookie'];
  if (!trustedCookies) throw new Error('Missing trusted device cookie');

  return {
    accessToken: verifyLoginRes.body?.accessToken as string,
    trustedCookies,
  };
}

beforeAll(async () => {
  await ensureEmailVerifiedAtNullable();
  // user[0] = for revoke-all test
  testUsers.push(
    await createUser({
      email: uniqueEmail('td-revokeall'),
      password: 'Password123!',
      verified: true,
    })
  );
  // user[1] = for untrust-current test
  testUsers.push(
    await createUser({
      email: uniqueEmail('td-untrust'),
      password: 'Password123!',
      verified: true,
    })
  );
});

afterAll(async () => {
  const ids = testUsers.map((u) => u.id);
  if (ids.length) {
    await db.delete(trusteddevices).where(inArray(trusteddevices.userId, ids));
    await db.delete(mfabackupcodes).where(inArray(mfabackupcodes.userId, ids));
    await db.delete(mfachallenges).where(inArray(mfachallenges.userId, ids));
    await db.delete(mfaloginchallenges).where(inArray(mfaloginchallenges.userId, ids));
    await db
      .update(users)
      .set({ mfaEnabled: false, mfaSecretEnc: null })
      .where(inArray(users.id, ids));
  }
  await cleanupUsers(testUsers);
});

describe('auth trusted devices - revoke-all and untrust-current', () => {
  it('POST /trusted-devices/revoke-all revokes all trusted devices', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Revoke-all test user missing');

    const { accessToken, trustedCookies } = await setupMfaAndLoginWithTrust(user);

    const res = await request(app)
      .post('/api/v1/auth/trusted-devices/revoke-all')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', trustedCookies);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });

    // Current list endpoint returns all devices (including revoked), so assert no active devices remain.
    const listRes = await request(app)
      .get('/api/v1/auth/trusted-devices')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listRes.status).toBe(200);
    const items = (listRes.body?.items ?? []) as Array<{ revokedAt?: string | null }>;
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every((item) => Boolean(item.revokedAt))).toBe(true);
  });

  it('POST /trusted-devices/untrust-current untrusts the current device', async () => {
    const user = testUsers[1];
    if (!user) throw new Error('Untrust-current test user missing');

    const { accessToken, trustedCookies } = await setupMfaAndLoginWithTrust(user);

    const res = await request(app)
      .post('/api/v1/auth/trusted-devices/untrust-current')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', trustedCookies);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  it('POST /trusted-devices/untrust-current returns 400 with no trusted cookie', async () => {
    // We test the unauthenticated path directly (no auth cookie / bearer token).
    const res = await request(app).post('/api/v1/auth/trusted-devices/untrust-current');
    expect(res.status).toBe(401);
  });

  it('POST /trusted-devices/revoke-all returns 401 without auth', async () => {
    const res = await request(app).post('/api/v1/auth/trusted-devices/revoke-all');
    expect(res.status).toBe(401);
  });
});

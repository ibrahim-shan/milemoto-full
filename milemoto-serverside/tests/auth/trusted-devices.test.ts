import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { trusteddevices, mfabackupcodes, mfachallenges, mfaloginchallenges, users } from '@milemoto/types';
import { base32Decode, totpCode } from '../../src/utils/totp.js';
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
      email: uniqueEmail('trusted'),
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
    await db.update(users).set({ mfaEnabled: false, mfaSecretEnc: null }).where(inArray(users.id, ids));
  }
  await cleanupUsers(testUsers);
});

describe('auth trusted devices', () => {
  it('creates and revokes trusted devices', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Trusted devices test user missing');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });
    const accessToken = loginRes.body?.accessToken as string | undefined;
    if (!accessToken) throw new Error('Missing access token');

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

    const loginMfaRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });
    const mfaChallengeId = loginMfaRes.body?.challengeId as string | undefined;
    if (!mfaChallengeId) throw new Error('Missing MFA challenge id');

    const verifyLoginRes = await request(app)
      .post('/api/v1/auth/mfa/login/verify')
      .send({ challengeId: mfaChallengeId, code, rememberDevice: true });
    expect(verifyLoginRes.status).toBe(200);
    const authToken = verifyLoginRes.body?.accessToken as string | undefined;
    if (!authToken) throw new Error('Missing MFA access token');
    const trustedCookies = verifyLoginRes.headers['set-cookie'];
    if (!trustedCookies) throw new Error('Missing trusted device cookie');

    const listRes = await request(app)
      .get('/api/v1/auth/trusted-devices')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Cookie', trustedCookies);
    expect(listRes.status).toBe(200);
    const items = listRes.body?.items as Array<{ id: string; current: boolean }> | undefined;
    expect(items && items.length > 0).toBeTruthy();

    const current = items?.find((item) => item.current);
    if (!current) throw new Error('Expected current trusted device');

    const revokeRes = await request(app)
      .post('/api/v1/auth/trusted-devices/revoke')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Cookie', trustedCookies)
      .send({ id: current.id });
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body).toMatchObject({ ok: true });
  });
});

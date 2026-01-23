import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { mfabackupcodes, mfachallenges, users } from '@milemoto/types';
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
      email: uniqueEmail('mfa-flow'),
      password: 'Password123!',
      verified: true,
    })
  );
});

afterAll(async () => {
  const ids = testUsers.map((u) => u.id);
  if (ids.length) {
    await db.delete(mfabackupcodes).where(inArray(mfabackupcodes.userId, ids));
    await db.delete(mfachallenges).where(inArray(mfachallenges.userId, ids));
    await db.update(users).set({ mfaEnabled: false, mfaSecretEnc: null }).where(inArray(users.id, ids));
  }
  await cleanupUsers(testUsers);
});

describe('auth mfa flow', () => {
  it('completes setup, verifies login with backup code, and disables MFA', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('MFA flow test user missing');

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
    expect(challengeId).toBeTruthy();
    expect(secretBase32).toBeTruthy();

    const secretRaw = base32Decode(secretBase32);
    const code = totpCode(secretRaw);

    const verifyRes = await request(app)
      .post('/api/v1/auth/mfa/setup/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ challengeId, code });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body).toMatchObject({ ok: true });
    const backupCodes = (verifyRes.body?.backupCodes ?? []) as string[];
    expect(backupCodes.length).toBeGreaterThan(0);

    const loginMfaRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });
    expect(loginMfaRes.status).toBe(200);
    const mfaChallengeId = loginMfaRes.body?.challengeId as string | undefined;
    if (!mfaChallengeId) throw new Error('Missing MFA challenge id');

    const backupCode = backupCodes[0] ?? '';
    const mfaVerifyRes = await request(app)
      .post('/api/v1/auth/mfa/login/verify')
      .send({ challengeId: mfaChallengeId, code: backupCode, rememberDevice: false });
    expect(mfaVerifyRes.status).toBe(200);
    expect(mfaVerifyRes.body).toHaveProperty('accessToken');

    const disableRes = await request(app)
      .post('/api/v1/auth/mfa/disable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: user.password, code: backupCodes[1] ?? backupCode });
    expect(disableRes.status).toBe(200);
    expect(disableRes.body).toMatchObject({ ok: true });
  });
});

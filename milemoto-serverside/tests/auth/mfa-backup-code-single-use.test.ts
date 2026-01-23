import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { mfabackupcodes, mfachallenges, mfaloginchallenges, users } from '@milemoto/types';
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
      email: uniqueEmail('mfa-backup'),
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
    await db.delete(mfaloginchallenges).where(inArray(mfaloginchallenges.userId, ids));
    await db.update(users).set({ mfaEnabled: false, mfaSecretEnc: null }).where(inArray(users.id, ids));
  }
  await cleanupUsers(testUsers);
});

describe('auth backup code single-use', () => {
  it('rejects reuse of a backup code', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Backup test user missing');

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
    const backupCodes = (verifyRes.body?.backupCodes ?? []) as string[];
    const backupCode = backupCodes[0];
    if (!backupCode) throw new Error('Missing backup code');

    const loginMfaRes1 = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });
    const mfaChallengeId1 = loginMfaRes1.body?.challengeId as string | undefined;
    if (!mfaChallengeId1) throw new Error('Missing MFA challenge id');

    const verifyLoginRes1 = await request(app)
      .post('/api/v1/auth/mfa/login/verify')
      .send({ challengeId: mfaChallengeId1, code: backupCode, rememberDevice: false });
    expect(verifyLoginRes1.status).toBe(200);

    const loginMfaRes2 = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });
    const mfaChallengeId2 = loginMfaRes2.body?.challengeId as string | undefined;
    if (!mfaChallengeId2) throw new Error('Missing MFA challenge id');

    const verifyLoginRes2 = await request(app)
      .post('/api/v1/auth/mfa/login/verify')
      .send({ challengeId: mfaChallengeId2, code: backupCode, rememberDevice: false });
    expect(verifyLoginRes2.status).toBe(400);
    expect(verifyLoginRes2.body?.code).toBe('InvalidCode');
  });
});

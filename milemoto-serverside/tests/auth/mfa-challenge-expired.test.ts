import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { mfaloginchallenges, mfachallenges, mfabackupcodes, users } from '@milemoto/types';
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
      email: uniqueEmail('mfa-expired'),
      password: 'Password123!',
      verified: true,
    })
  );
});

afterAll(async () => {
  const ids = testUsers.map((u) => u.id);
  if (ids.length) {
    await db.delete(mfabackupcodes).where(eq(mfabackupcodes.userId, ids[0]!));
    await db.delete(mfachallenges).where(eq(mfachallenges.userId, ids[0]!));
    await db.delete(mfaloginchallenges).where(eq(mfaloginchallenges.userId, ids[0]!));
    await db.update(users).set({ mfaEnabled: false, mfaSecretEnc: null }).where(eq(users.id, ids[0]!));
  }
  await cleanupUsers(testUsers);
});

describe('auth mfa challenge expiry', () => {
  it('rejects expired login challenges', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('MFA expiry test user missing');

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

    await db
      .update(mfaloginchallenges)
      .set({ expiresAt: new Date(Date.now() - 60 * 1000) })
      .where(eq(mfaloginchallenges.id, mfaChallengeId));

    const verifyLoginRes = await request(app)
      .post('/api/v1/auth/mfa/login/verify')
      .send({ challengeId: mfaChallengeId, code, rememberDevice: false });

    expect(verifyLoginRes.status).toBe(400);
    expect(verifyLoginRes.body?.code).toBe('ChallengeExpired');
  });
});

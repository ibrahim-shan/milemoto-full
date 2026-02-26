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
      email: uniqueEmail('mfa-regen'),
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
    await db
      .update(users)
      .set({ mfaEnabled: false, mfaSecretEnc: null })
      .where(inArray(users.id, ids));
  }
  await cleanupUsers(testUsers);
});

describe('auth mfa backup code regeneration', () => {
  it('regenerates backup codes for MFA-enabled user', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('MFA regen test user missing');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });
    const accessToken = loginRes.body?.accessToken as string | undefined;
    if (!accessToken) throw new Error('Missing access token');

    // Setup MFA first
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
    const originalCodes = (verifyRes.body?.backupCodes ?? []) as string[];

    // Regenerate backup codes
    const regenRes = await request(app)
      .post('/api/v1/auth/mfa/backup-codes/regen')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(regenRes.status).toBe(200);
    const newCodes = (regenRes.body?.backupCodes ?? []) as string[];
    expect(Array.isArray(newCodes)).toBe(true);
    expect(newCodes.length).toBeGreaterThan(0);
    // New codes should differ from original codes
    expect(newCodes[0]).not.toBe(originalCodes[0]);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).post('/api/v1/auth/mfa/backup-codes/regen');
    expect(res.status).toBe(401);
  });
});

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { sitesettings, users } from '@milemoto/types';
import {
  cleanupUsers,
  createUser,
  ensureEmailVerifiedAtNullable,
  uniqueEmail,
  type TestUser,
} from './helpers.js';

const testUsers: TestUser[] = [];
let originalPhoneVerificationEnabled: string | null = null;

beforeAll(async () => {
  await ensureEmailVerifiedAtNullable();
  const existing = await db
    .select({ settingValue: sitesettings.settingValue })
    .from(sitesettings)
    .where(eq(sitesettings.settingKey, 'phoneVerificationEnabled'))
    .limit(1);
  originalPhoneVerificationEnabled = existing[0]?.settingValue ?? null;
  await db
    .insert(sitesettings)
    .values({ settingKey: 'phoneVerificationEnabled', settingValue: 'true' })
    .onDuplicateKeyUpdate({ set: { settingValue: 'true' } });

  const user = await createUser({
    email: uniqueEmail('phonestart'),
    password: 'Password123!',
    verified: true,
  });
  await db.update(users).set({ phone: '+15555550400' }).where(eq(users.id, user.id));
  testUsers.push(user);
});

afterAll(async () => {
  if (originalPhoneVerificationEnabled === null) {
    await db.delete(sitesettings).where(eq(sitesettings.settingKey, 'phoneVerificationEnabled'));
  } else {
    await db
      .insert(sitesettings)
      .values({
        settingKey: 'phoneVerificationEnabled',
        settingValue: originalPhoneVerificationEnabled,
      })
      .onDuplicateKeyUpdate({ set: { settingValue: originalPhoneVerificationEnabled } });
  }
  await cleanupUsers(testUsers);
});

describe('auth phone verify start', () => {
  it('starts phone verification flow for authenticated user with phone set', async () => {
    const user = testUsers[0];
    if (!user) throw new Error('Phone verify start test user missing');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      identifier: user.email,
      password: user.password,
      remember: false,
    });

    const accessToken = loginRes.body?.accessToken as string | undefined;
    if (!accessToken) throw new Error('Missing access token');

    const res = await request(app)
      .post('/api/v1/auth/phone/verify/start')
      .set('Authorization', `Bearer ${accessToken}`);

    // In test environments without an active SMS gateway, the service returns
    // SmsGatewayNotConfigured after auth/user checks pass.
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toMatchObject({ ok: true });
    } else {
      expect(res.body?.code).toBe('SmsGatewayNotConfigured');
    }
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).post('/api/v1/auth/phone/verify/start');
    expect(res.status).toBe(401);
  });
});

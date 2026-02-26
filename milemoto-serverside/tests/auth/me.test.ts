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
let accessToken = '';

beforeAll(async () => {
  await ensureEmailVerifiedAtNullable();
  testUsers.push(
    await createUser({
      email: uniqueEmail('me'),
      password: 'Password123!',
      verified: true,
    })
  );

  const loginRes = await request(app).post('/api/v1/auth/login').send({
    identifier: testUsers[0]!.email,
    password: testUsers[0]!.password,
    remember: false,
  });
  accessToken = (loginRes.body?.accessToken as string) ?? '';
  if (!accessToken) throw new Error('Could not obtain access token for /me tests');
});

afterAll(async () => {
  await cleanupUsers(testUsers);
});

describe('auth /me profile endpoints', () => {
  it('GET /me returns user profile for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email');
    expect(res.body).toHaveProperty('fullName');
  });

  it('GET /me returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /me/update updates fullName', async () => {
    const res = await request(app)
      .post('/api/v1/auth/me/update')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('fullName', 'Updated Name');
  });

  it('POST /me/update returns 401 without auth', async () => {
    const res = await request(app).post('/api/v1/auth/me/update').send({ fullName: 'Hacker' });
    expect(res.status).toBe(401);
  });

  it('POST /me/address updates default shipping address', async () => {
    const res = await request(app)
      .post('/api/v1/auth/me/address')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: 'Test User',
        phone: '+15555550000',
        country: 'US',
        state: 'CA',
        city: 'Los Angeles',
        addressLine1: '123 Main St',
      });

    expect(res.status).toBe(200);
  });

  it('POST /me/address returns 401 without auth', async () => {
    const res = await request(app).post('/api/v1/auth/me/address').send({
      fullName: 'Test',
      phone: '+15555550000',
      country: 'US',
      state: 'CA',
      city: 'LA',
      addressLine1: '1 Street',
    });
    expect(res.status).toBe(401);
  });
});

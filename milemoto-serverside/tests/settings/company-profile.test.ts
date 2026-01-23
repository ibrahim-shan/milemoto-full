import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'settings.read', description: 'View settings', resourceGroup: 'Settings' },
    { slug: 'settings.manage', description: 'Manage settings', resourceGroup: 'Settings' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);
});

afterAll(async () => {
  await cleanupCatalogAuth(authCleanup);
});

describe('settings company profile', () => {
  it('gets company profile (may be null initially)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/company')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body === null || typeof res.body === 'object').toBe(true);
  });

  it('creates or updates company profile', async () => {
    const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
    const res = await request(app)
      .put('/api/v1/admin/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `MileMoto ${suffix}`,
        publicEmail: `hello-${suffix.toLowerCase()}@milemoto.local`,
        phone: `+9617676${suffix.slice(0, 2)}`,
        website: 'https://milemoto.local',
        address: `Street ${suffix}`,
        city: 'Beirut',
        state: 'Beirut',
        zip: '1107',
        countryId: null,
        latitude: 33.8938,
        longitude: 35.5018,
      });

    expect(res.status).toBe(200);
    expect(res.body?.name).toBe(`MileMoto ${suffix}`);
    expect(Number(res.body?.latitude)).toBeCloseTo(33.8938, 4);
    expect(Number(res.body?.longitude)).toBeCloseTo(35.5018, 4);
  });

  it('gets updated company profile', async () => {
    const res = await request(app)
      .get('/api/v1/admin/company')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body?.name).toBeTruthy();
  });

  it('updates company profile fields', async () => {
    const res = await request(app)
      .put('/api/v1/admin/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'MileMoto Updated',
        publicEmail: 'support@milemoto.local',
        phone: '+96170000000',
        website: 'https://milemoto.example',
        address: 'Updated Address',
        city: 'Tripoli',
        state: 'North',
        zip: '1300',
        countryId: null,
        latitude: 34.433,
        longitude: 35.833,
      });

    expect(res.status).toBe(200);
    expect(res.body?.name).toBe('MileMoto Updated');
    expect(res.body?.city).toBe('Tripoli');
  });
});

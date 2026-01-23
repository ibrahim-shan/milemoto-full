import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

let locationId: number | null = null;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'locations.read', description: 'View locations', resourceGroup: 'Settings' },
    { slug: 'locations.manage', description: 'Manage locations', resourceGroup: 'Settings' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);
});

afterAll(async () => {
  await cleanupCatalogAuth(authCleanup);
});

describe('settings stock locations', () => {
  it('creates a stock location', async () => {
    const suffix = crypto.randomUUID().slice(0, 6);
    const res = await request(app)
      .post('/api/v1/admin/stock-locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Warehouse ${suffix}`,
        type: 'Warehouse',
        description: 'Main warehouse',
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'Testland',
        status: 'active',
      });

    expect(res.status).toBe(201);
    locationId = Number(res.body.id);
    expect(locationId).toBeTruthy();
  });

  it('lists stock locations', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stock-locations')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((l: { id: number }) => l.id);
    expect(ids).toContain(locationId);
  });

  it('gets a stock location by id', async () => {
    if (!locationId) throw new Error('Missing location id');
    const res = await request(app)
      .get(`/api/v1/admin/stock-locations/${locationId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.id)).toBe(locationId);
  });

  it('updates a stock location', async () => {
    if (!locationId) throw new Error('Missing location id');
    const res = await request(app)
      .put(`/api/v1/admin/stock-locations/${locationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ description: 'Updated warehouse' });

    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Updated warehouse');
  });

  it('deletes a stock location', async () => {
    if (!locationId) throw new Error('Missing location id');
    const res = await request(app)
      .delete(`/api/v1/admin/stock-locations/${locationId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    locationId = null;
  });
});

import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

let unitGroupId: number | null = null;

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

describe('settings units', () => {
  it('creates a unit group', async () => {
    const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
    const res = await request(app)
      .post('/api/v1/admin/units')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Units ${suffix}`,
        status: 'active',
        values: [{ name: 'Piece', code: `PC${suffix}` }],
        fields: [{ name: 'Weight', required: false }],
      });

    expect(res.status).toBe(201);
    unitGroupId = Number(res.body.id);
    expect(unitGroupId).toBeTruthy();
  });

  it('lists unit groups', async () => {
    const res = await request(app)
      .get('/api/v1/admin/units')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((u: { id: number }) => u.id);
    expect(ids).toContain(unitGroupId);
  });

  it('gets a unit group by id', async () => {
    if (!unitGroupId) throw new Error('Missing unit group id');
    const res = await request(app)
      .get(`/api/v1/admin/units/${unitGroupId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.id)).toBe(unitGroupId);
  });

  it('updates a unit group', async () => {
    if (!unitGroupId) throw new Error('Missing unit group id');
    const res = await request(app)
      .put(`/api/v1/admin/units/${unitGroupId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Updated Units',
        status: 'active',
        values: [{ name: 'Piece', code: 'PCS' }],
        fields: [{ name: 'Weight', required: true }],
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Units');
  });

  it('deletes a unit group', async () => {
    if (!unitGroupId) throw new Error('Missing unit group id');
    const res = await request(app)
      .delete(`/api/v1/admin/units/${unitGroupId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    unitGroupId = null;
  });
});

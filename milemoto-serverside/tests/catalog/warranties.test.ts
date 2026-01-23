import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from './helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

let warrantyId: number | null = null;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'warranties.read', description: 'View warranties', resourceGroup: 'Catalog' },
    { slug: 'warranties.manage', description: 'Manage warranties', resourceGroup: 'Catalog' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);
});

afterAll(async () => {
  await cleanupCatalogAuth(authCleanup);
});

describe('catalog warranties', () => {
  it('creates a warranty', async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const res = await request(app)
      .post('/api/v1/admin/warranties')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Warranty ${suffix}`,
        description: 'Test warranty',
        status: 'active',
      });

    expect(res.status).toBe(201);
    warrantyId = Number(res.body.id);
    expect(warrantyId).toBeTruthy();
  });

  it('lists warranties', async () => {
    const res = await request(app)
      .get('/api/v1/admin/warranties')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((w: { id: number }) => w.id);
    expect(ids).toContain(warrantyId);
  });

  it('gets a warranty by id', async () => {
    if (!warrantyId) throw new Error('Missing warranty id');
    const res = await request(app)
      .get(`/api/v1/admin/warranties/${warrantyId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.id)).toBe(warrantyId);
  });

  it('updates a warranty', async () => {
    if (!warrantyId) throw new Error('Missing warranty id');
    const res = await request(app)
      .put(`/api/v1/admin/warranties/${warrantyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ description: 'Updated warranty' });

    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Updated warranty');
  });

  it('deletes a warranty', async () => {
    if (!warrantyId) throw new Error('Missing warranty id');
    const res = await request(app)
      .delete(`/api/v1/admin/warranties/${warrantyId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    warrantyId = null;
  });
});

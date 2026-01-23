import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from './helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

let variantId: number | null = null;
let valueId: number | null = null;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'variants.read', description: 'View variants', resourceGroup: 'Catalog' },
    { slug: 'variants.manage', description: 'Manage variants', resourceGroup: 'Catalog' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);
});

afterAll(async () => {
  await cleanupCatalogAuth(authCleanup);
});

describe('catalog variants', () => {
  it('creates a variant with values', async () => {
    const res = await request(app)
      .post('/api/v1/admin/variants')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Color ${Date.now()}`,
        slug: `color-${Date.now()}`,
        values: [
          { value: 'Red', slug: `red-${Date.now()}`, status: 'active' },
        ],
      });

    expect(res.status).toBe(201);
    variantId = Number(res.body.id);
    valueId = res.body?.values?.[0]?.id ? Number(res.body.values[0].id) : null;
    expect(variantId).toBeTruthy();
  });

  it('updates a variant value', async () => {
    if (!valueId) throw new Error('Missing variant value id');
    const res = await request(app)
      .put(`/api/v1/admin/variants/values/${valueId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ value: 'Blue' });

    expect(res.status).toBe(200);
    expect(res.body?.value).toBe('Blue');
  });

  it('adds a variant value', async () => {
    if (!variantId) throw new Error('Missing variant id');
    const res = await request(app)
      .post(`/api/v1/admin/variants/${variantId}/values`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ value: 'Green', slug: `green-${Date.now()}` });

    expect(res.status).toBe(201);
    expect(res.body?.id).toBeTruthy();
  });

  it('deletes a variant value', async () => {
    if (!valueId) throw new Error('Missing variant value id');
    const res = await request(app)
      .delete(`/api/v1/admin/variants/values/${valueId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    valueId = null;
  });

  it('deletes a variant', async () => {
    if (!variantId) throw new Error('Missing variant id');
    const res = await request(app)
      .delete(`/api/v1/admin/variants/${variantId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    variantId = null;
  });
});

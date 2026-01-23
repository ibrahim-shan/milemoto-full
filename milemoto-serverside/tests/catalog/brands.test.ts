import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from './helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

let brandId: number | null = null;
const brandSlug = `brand-${Date.now()}`;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'brands.read', description: 'View brands', resourceGroup: 'Catalog' },
    { slug: 'brands.manage', description: 'Manage brands', resourceGroup: 'Catalog' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);
});

afterAll(async () => {
  await cleanupCatalogAuth(authCleanup);
});

describe('catalog brands', () => {
  it('creates a brand', async () => {
    const res = await request(app)
      .post('/api/v1/admin/brands')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Brand ${Date.now()}`,
        slug: brandSlug,
        description: 'Test brand',
        status: 'active',
      });

    expect(res.status).toBe(201);
    expect(res.body?.id).toBeTruthy();
    brandId = Number(res.body.id);
  });

  it('lists brands', async () => {
    const res = await request(app)
      .get('/api/v1/admin/brands')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const slugs = (items ?? []).map((b: { slug: string }) => b.slug);
    expect(slugs).toContain(brandSlug);
  });

  it('gets a brand by id', async () => {
    if (!brandId) throw new Error('Missing brand id');
    const res = await request(app)
      .get(`/api/v1/admin/brands/${brandId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body?.id).toBe(brandId);
  });

  it('updates a brand', async () => {
    if (!brandId) throw new Error('Missing brand id');
    const res = await request(app)
      .put(`/api/v1/admin/brands/${brandId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Brand ${Date.now()} Updated` });

    expect(res.status).toBe(200);
    expect(res.body?.name).toContain('Updated');
  });

  it('deletes a brand', async () => {
    if (!brandId) throw new Error('Missing brand id');
    const res = await request(app)
      .delete(`/api/v1/admin/brands/${brandId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    brandId = null;
  });
});

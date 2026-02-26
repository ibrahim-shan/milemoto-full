import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from './helpers.js';

let accessToken = '';
const authCleanup = {
  userIds: [] as number[],
  roleIds: [] as number[],
  permissionIds: [] as number[],
};

let rootId: number | null = null;
let childId: number | null = null;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'categories.read', description: 'View categories', resourceGroup: 'Catalog' },
    { slug: 'categories.manage', description: 'Manage categories', resourceGroup: 'Catalog' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);
});

afterAll(async () => {
  await cleanupCatalogAuth(authCleanup);
});

describe('catalog categories', () => {
  it('creates root and child categories', async () => {
    const rootRes = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Category ${Date.now()}`,
        slug: `category-${Date.now()}`,
        description: 'Root category',
        status: 'active',
      });

    expect(rootRes.status).toBe(201);
    rootId = Number(rootRes.body.id);

    const childRes = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `SubCategory ${Date.now()}`,
        slug: `subcategory-${Date.now()}`,
        parentId: rootId,
        description: 'Child category',
        status: 'active',
      });

    expect(childRes.status).toBe(201);
    childId = Number(childRes.body.id);
  });

  it('lists categories', async () => {
    const res = await request(app)
      .get('/api/v1/admin/categories')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((c: { id: number }) => c.id);
    expect(ids).toContain(rootId);
    expect(ids).toContain(childId);
  });

  it('returns category tree', async () => {
    const res = await request(app)
      .get('/api/v1/admin/categories/tree')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const hasRoot = (res.body ?? []).some((node: { id: number }) => node.id === rootId);
    expect(hasRoot).toBe(true);
  });

  it('lists all categories (flat, no pagination)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/categories/all')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    const ids = (res.body.items ?? []).map((c: { id: number }) => c.id);
    expect(ids).toContain(rootId);
  });

  it('gets a category by id', async () => {
    if (!rootId) throw new Error('Missing root category id');
    const res = await request(app)
      .get(`/api/v1/admin/categories/${rootId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body?.id).toBe(rootId);
  });

  it('updates a category', async () => {
    if (!rootId) throw new Error('Missing root category id');
    const res = await request(app)
      .put(`/api/v1/admin/categories/${rootId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ description: 'Updated description' });

    expect(res.status).toBe(200);
    expect(res.body?.description).toBe('Updated description');
  });

  it('deletes child then root', async () => {
    if (!childId || !rootId) throw new Error('Missing category ids');
    const childRes = await request(app)
      .delete(`/api/v1/admin/categories/${childId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(childRes.status).toBe(204);

    const rootRes = await request(app)
      .delete(`/api/v1/admin/categories/${rootId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(rootRes.status).toBe(204);

    childId = null;
    rootId = null;
  });
});

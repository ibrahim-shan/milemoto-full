import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from './helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

let collectionId: number | null = null;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'collections.read', description: 'View collections', resourceGroup: 'Catalog' },
    { slug: 'collections.manage', description: 'Manage collections', resourceGroup: 'Catalog' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);
});

afterAll(async () => {
  await cleanupCatalogAuth(authCleanup);
});

describe('catalog collections', () => {
  it('creates a manual collection', async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const res = await request(app)
      .post('/api/v1/admin/collections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Collection ${suffix}`,
        slug: `collection-${suffix}`,
        status: 'active',
        type: 'manual',
        matchType: 'all',
        rules: [],
      });

    expect(res.status).toBe(201);
    collectionId = Number(res.body.id);
    expect(collectionId).toBeTruthy();
  });

  it('lists collections', async () => {
    const res = await request(app)
      .get('/api/v1/admin/collections')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((c: { id: number }) => c.id);
    expect(ids).toContain(collectionId);
  });

  it('gets a collection by id', async () => {
    if (!collectionId) throw new Error('Missing collection id');
    const res = await request(app)
      .get(`/api/v1/admin/collections/${collectionId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.id)).toBe(collectionId);
  });

  it('updates a collection', async () => {
    if (!collectionId) throw new Error('Missing collection id');
    const res = await request(app)
      .put(`/api/v1/admin/collections/${collectionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Collection' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Collection');
  });

  it('previews a collection (manual)', async () => {
    if (!collectionId) throw new Error('Missing collection id');
    const res = await request(app)
      .post(`/api/v1/admin/collections/${collectionId}/preview`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rules: [] });

    expect(res.status).toBe(400);
    expect(res.body?.message).toBe('Preview is only available for automatic collections');
  });

  it('deletes a collection', async () => {
    if (!collectionId) throw new Error('Missing collection id');
    const res = await request(app)
      .delete(`/api/v1/admin/collections/${collectionId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    collectionId = null;
  });
});

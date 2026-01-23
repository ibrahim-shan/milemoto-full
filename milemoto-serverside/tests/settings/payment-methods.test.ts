import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

let activeId: number | null = null;
let inactiveId: number | null = null;

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

describe('settings payment methods', () => {
  it('creates payment methods (active + inactive)', async () => {
    const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
    const activeRes = await request(app)
      .post('/api/v1/admin/payment-methods')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Card ${suffix}`, status: 'active' });

    expect(activeRes.status).toBe(201);
    activeId = Number(activeRes.body.id);
    expect(activeId).toBeTruthy();

    const inactiveRes = await request(app)
      .post('/api/v1/admin/payment-methods')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Wire ${suffix}`, status: 'inactive' });

    expect(inactiveRes.status).toBe(201);
    inactiveId = Number(inactiveRes.body.id);
    expect(inactiveId).toBeTruthy();
  });

  it('lists payment methods', async () => {
    const res = await request(app)
      .get('/api/v1/admin/payment-methods')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((m: { id: number }) => m.id);
    expect(ids).toContain(activeId);
    expect(ids).toContain(inactiveId);
  });

  it('filters payment methods by status', async () => {
    const res = await request(app)
      .get('/api/v1/admin/payment-methods')
      .query({ limit: 100, status: 'inactive' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((m: { id: number }) => m.id);
    expect(ids).toContain(inactiveId);
  });

  it('gets a payment method by id', async () => {
    if (!activeId) throw new Error('Missing payment method id');
    const res = await request(app)
      .get(`/api/v1/admin/payment-methods/${activeId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.id)).toBe(activeId);
  });

  it('updates a payment method', async () => {
    if (!activeId) throw new Error('Missing payment method id');
    const res = await request(app)
      .put(`/api/v1/admin/payment-methods/${activeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Payment', status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Payment');
    expect(res.body.status).toBe('inactive');
  });

  it('deletes payment methods', async () => {
    if (!activeId || !inactiveId) throw new Error('Missing payment method id');
    const deleteActive = await request(app)
      .delete(`/api/v1/admin/payment-methods/${activeId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(deleteActive.status).toBe(204);
    activeId = null;

    const deleteInactive = await request(app)
      .delete(`/api/v1/admin/payment-methods/${inactiveId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(deleteInactive.status).toBe(204);
    inactiveId = null;
  });
});

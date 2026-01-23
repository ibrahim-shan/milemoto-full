import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';

let accessToken = '';
let languageId: number | null = null;

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

describe('settings languages', () => {
  it('creates a language', async () => {
    const code = `t${Date.now().toString().slice(-4)}`;
    const res = await request(app)
      .post('/api/v1/admin/languages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Test Lang ${code}`,
        code,
        displayMode: 'LTR',
        countryCode: 'LB',
        status: 'active',
      });

    expect(res.status).toBe(201);
    languageId = Number(res.body.id);
    expect(languageId).toBeTruthy();
  });

  it('lists languages (with status filter)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/languages')
      .query({ page: 1, limit: 20, status: 'active' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((l: { id: number }) => l.id);
    if (languageId) expect(ids).toContain(languageId);
  });

  it('updates language status to inactive', async () => {
    if (!languageId) throw new Error('Missing language id');
    const res = await request(app)
      .put(`/api/v1/admin/languages/${languageId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body?.status).toBe('inactive');
  });

  it('deletes a language', async () => {
    if (!languageId) throw new Error('Missing language id');
    const res = await request(app)
      .delete(`/api/v1/admin/languages/${languageId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
  });
});

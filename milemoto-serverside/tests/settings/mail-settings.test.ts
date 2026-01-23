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

describe('settings mail', () => {
  it('gets mail settings', async () => {
    const res = await request(app)
      .get('/api/v1/admin/mail')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('updates mail settings and marks password saved', async () => {
    const res = await request(app)
      .put('/api/v1/admin/mail')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        host: 'smtp.test.local',
        port: 587,
        username: 'user',
        password: 'test-password',
        encryption: 'tls',
        fromName: 'Milemoto',
        fromEmail: 'no-reply@milemoto.local',
      });

    expect(res.status).toBe(200);
    expect(res.body?.host).toBe('smtp.test.local');
    expect(res.body?.port).toBe(587);
    expect(res.body?.hasPassword).toBe(true);
  });

  it('clears mail password when requested', async () => {
    const res = await request(app)
      .put('/api/v1/admin/mail')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: null });

    expect(res.status).toBe(200);
    expect(res.body?.hasPassword).toBe(false);
  });

  it('sends a test email (dummy transport in test env)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/mail/test')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ toEmail: 'test@milemoto.local' });

    expect(res.status).toBe(200);
    expect(res.body?.ok).toBe(true);
  });
});

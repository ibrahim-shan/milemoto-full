import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from './helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

let gradeId: number | null = null;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'grades.read', description: 'View grades', resourceGroup: 'Catalog' },
    { slug: 'grades.manage', description: 'Manage grades', resourceGroup: 'Catalog' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);
});

afterAll(async () => {
  await cleanupCatalogAuth(authCleanup);
});

describe('catalog grades', () => {
  it('creates a grade', async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const res = await request(app)
      .post('/api/v1/admin/grades')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Grade ${suffix}`,
        slug: `grade-${suffix}`,
        description: 'Test grade',
        status: 'active',
      });

    expect(res.status).toBe(201);
    gradeId = Number(res.body.id);
    expect(gradeId).toBeTruthy();
  });

  it('lists grades', async () => {
    const res = await request(app)
      .get('/api/v1/admin/grades')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((g: { id: number }) => g.id);
    expect(ids).toContain(gradeId);
  });

  it('gets a grade by id', async () => {
    if (!gradeId) throw new Error('Missing grade id');
    const res = await request(app)
      .get(`/api/v1/admin/grades/${gradeId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.id)).toBe(gradeId);
  });

  it('updates a grade', async () => {
    if (!gradeId) throw new Error('Missing grade id');
    const res = await request(app)
      .put(`/api/v1/admin/grades/${gradeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ description: 'Updated grade' });

    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Updated grade');
  });

  it('deletes a grade', async () => {
    if (!gradeId) throw new Error('Missing grade id');
    const res = await request(app)
      .delete(`/api/v1/admin/grades/${gradeId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    gradeId = null;
  });
});

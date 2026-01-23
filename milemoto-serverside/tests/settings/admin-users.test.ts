import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { roles, users } from '@milemoto/types';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

let userId: number | null = null;
let roleAId: number | null = null;
let roleBId: number | null = null;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'users.read', description: 'View users', resourceGroup: 'System' },
    { slug: 'users.manage', description: 'Manage users', resourceGroup: 'System' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);

  const suffix = crypto.randomUUID().slice(0, 8);
  const roleA = await db
    .insert(roles)
    .values({ name: `Test Role A ${suffix}`, description: null, isSystem: false })
    .$returningId();
  roleAId = Number(roleA[0]?.id);

  const roleB = await db
    .insert(roles)
    .values({ name: `Test Role B ${suffix}`, description: null, isSystem: false })
    .$returningId();
  roleBId = Number(roleB[0]?.id);
});

afterAll(async () => {
  if (userId) {
    await db.delete(users).where(inArray(users.id, [userId]));
  }
  const roleIds = [roleAId, roleBId].filter((id): id is number => Number.isFinite(id));
  if (roleIds.length) {
    await db.delete(roles).where(inArray(roles.id, roleIds));
  }
  await cleanupCatalogAuth(authCleanup);
});

describe('settings admin users', () => {
  it('creates a user', async () => {
    const suffix = crypto.randomUUID().slice(0, 6);
    const res = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: `user-${suffix}@milemoto.local`,
        fullName: `User ${suffix}`,
        password: 'Password123!',
        status: 'active',
        roleId: roleAId,
      });

    expect(res.status).toBe(201);
    userId = Number(res.body?.id);
    expect(userId).toBeTruthy();
    expect(res.body?.roleId).toBe(roleAId);
  });

  it('lists users', async () => {
    if (!userId) throw new Error('Missing user id');
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body ?? [];
    const ids = items.map((u: { id: number }) => u.id);
    expect(ids).toContain(userId);
  });

  it('updates role and status', async () => {
    if (!userId) throw new Error('Missing user id');
    const res = await request(app)
      .put(`/api/v1/admin/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        roleId: roleBId,
        status: 'blocked',
      });

    expect(res.status).toBe(200);
    expect(res.body?.roleId).toBe(roleBId);
    expect(res.body?.status).toBe('blocked');
  });

  it('gets user by id', async () => {
    if (!userId) throw new Error('Missing user id');
    const res = await request(app)
      .get(`/api/v1/admin/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body?.id).toBe(userId);
    expect(res.body?.roleId).toBe(roleBId);
  });

  it('deletes user', async () => {
    if (!userId) throw new Error('Missing user id');
    const res = await request(app)
      .delete(`/api/v1/admin/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
  });
});

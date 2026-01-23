import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { ensureEmailVerifiedAtNullable } from '../auth/helpers.js';
import {
  cleanupRbac,
  createAdminUser,
  createRoleWithPermissions,
  ensurePermission,
} from './helpers.js';

const createdPermissionIds: number[] = [];
const createdRoleIds: number[] = [];
const createdUserIds: number[] = [];

let accessToken = '';
let systemRoleId: number | null = null;

beforeAll(async () => {
  await ensureEmailVerifiedAtNullable();
  const managePerm = await ensurePermission({
    slug: 'rbac.manage',
    description: 'Manage roles',
    resourceGroup: 'System',
  });
  if (managePerm.created) createdPermissionIds.push(managePerm.id);

  const adminRoleId = await createRoleWithPermissions({
    name: `RBAC Admin ${Date.now()}`,
    permissionIds: [managePerm.id],
  });
  createdRoleIds.push(adminRoleId);

  const admin = await createAdminUser({
    email: `rbac-admin-${Date.now()}@milemoto.local`,
    password: 'Password123!',
    roleId: adminRoleId,
  });
  createdUserIds.push(admin.id);

  const loginRes = await request(app).post('/api/v1/auth/login').send({
    identifier: admin.email,
    password: admin.password,
    remember: false,
  });
  accessToken = loginRes.body?.accessToken ?? '';
  if (!accessToken) throw new Error('Missing access token');

  systemRoleId = await createRoleWithPermissions({
    name: `System Role ${Date.now()}`,
    permissionIds: [],
    isSystem: true,
  });
  createdRoleIds.push(systemRoleId);
});

afterAll(async () => {
  await cleanupRbac({
    userIds: createdUserIds,
    roleIds: createdRoleIds,
    permissionIds: createdPermissionIds,
  });
});

describe('rbac system role protection', () => {
  it('blocks updates to system roles', async () => {
    if (!systemRoleId) throw new Error('Missing system role id');
    const res = await request(app)
      .put(`/api/v1/admin/rbac/roles/${systemRoleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `System Role ${Date.now()} Updated` });

    expect(res.status).toBe(403);
  });

  it('blocks deletion of system roles', async () => {
    if (!systemRoleId) throw new Error('Missing system role id');
    const res = await request(app)
      .delete(`/api/v1/admin/rbac/roles/${systemRoleId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });
});

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

beforeAll(async () => {
  await ensureEmailVerifiedAtNullable();
  const readPerm = await ensurePermission({
    slug: 'rbac.read',
    description: 'View roles',
    resourceGroup: 'System',
  });
  const managePerm = await ensurePermission({
    slug: 'rbac.manage',
    description: 'Manage roles',
    resourceGroup: 'System',
  });
  if (readPerm.created) createdPermissionIds.push(readPerm.id);
  if (managePerm.created) createdPermissionIds.push(managePerm.id);

  const roleId = await createRoleWithPermissions({
    name: `RBAC Admin ${Date.now()}`,
    permissionIds: [readPerm.id, managePerm.id],
  });
  createdRoleIds.push(roleId);

  const admin = await createAdminUser({
    email: `rbac-admin-${Date.now()}@milemoto.local`,
    password: 'Password123!',
    roleId,
  });
  createdUserIds.push(admin.id);

  const loginRes = await request(app).post('/api/v1/auth/login').send({
    identifier: admin.email,
    password: admin.password,
    remember: false,
  });
  accessToken = loginRes.body?.accessToken ?? '';
  if (!accessToken) throw new Error('Missing access token');
});

afterAll(async () => {
  await cleanupRbac({
    userIds: createdUserIds,
    roleIds: createdRoleIds,
    permissionIds: createdPermissionIds,
  });
});

describe('rbac permissions', () => {
  it('lists permissions for authorized admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/rbac/permissions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const slugs = (res.body ?? []).map((p: { slug: string }) => p.slug);
    expect(slugs).toContain('rbac.read');
    expect(slugs).toContain('rbac.manage');
  });
});

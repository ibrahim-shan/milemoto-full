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
let createdRoleId: number | null = null;

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
    roleIds: createdRoleIds.concat(createdRoleId ? [createdRoleId] : []),
    permissionIds: createdPermissionIds,
  });
});

describe('rbac roles', () => {
  it('creates a role', async () => {
    const res = await request(app)
      .post('/api/v1/admin/rbac/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Support ${Date.now()}`,
        description: 'Support role',
        permissionIds: [],
      });

    expect(res.status).toBe(201);
    expect(res.body?.id).toBeTruthy();
    createdRoleId = Number(res.body.id);
    createdRoleIds.push(createdRoleId);
  });

  it('fetches role details with permissions', async () => {
    if (!createdRoleId) throw new Error('Missing created role id');
    const res = await request(app)
      .get(`/api/v1/admin/rbac/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body?.id).toBe(createdRoleId);
    expect(Array.isArray(res.body?.permissions)).toBe(true);
  });

  it('updates a role', async () => {
    if (!createdRoleId) throw new Error('Missing created role id');
    const res = await request(app)
      .put(`/api/v1/admin/rbac/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Support ${Date.now()} Updated`,
        description: 'Updated support role',
      });

    expect(res.status).toBe(200);
    expect(res.body?.description).toBe('Updated support role');
  });

  it('lists roles with search', async () => {
    const res = await request(app)
      .get('/api/v1/admin/rbac/roles')
      .query({ search: 'Support' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const names = (res.body ?? []).map((r: { name: string }) => r.name);
    expect(names.some((n: string) => n.includes('Support'))).toBe(true);
  });

  it('deletes a role', async () => {
    if (!createdRoleId) throw new Error('Missing created role id');
    const res = await request(app)
      .delete(`/api/v1/admin/rbac/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    createdRoleId = null;
  });
});

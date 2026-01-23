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
let roleId: number | null = null;
let roleName = '';

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

  roleName = `Unique Role ${Date.now()}`;
  roleId = await createRoleWithPermissions({
    name: roleName,
    permissionIds: [],
  });
  createdRoleIds.push(roleId);
});

afterAll(async () => {
  await cleanupRbac({
    userIds: createdUserIds,
    roleIds: createdRoleIds,
    permissionIds: createdPermissionIds,
  });
});

describe('rbac role uniqueness', () => {
  it('rejects creating a role with an existing name', async () => {
    if (!roleId) throw new Error('Missing role id');
    const roleName = `Unique Name ${Date.now()}`;
    const createRes = await request(app)
      .post('/api/v1/admin/rbac/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: roleName });

    expect(createRes.status).toBe(201);
    createdRoleIds.push(Number(createRes.body.id));

    const duplicateRes = await request(app)
      .post('/api/v1/admin/rbac/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: roleName });

    expect(duplicateRes.status).toBe(409);
  });

  it('rejects updating a role to an existing name', async () => {
    if (!roleId) throw new Error('Missing role id');
    const otherName = `Unique Name ${Date.now()}`;
    const otherRes = await request(app)
      .post('/api/v1/admin/rbac/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: otherName });

    expect(otherRes.status).toBe(201);
    const otherId = Number(otherRes.body.id);
    createdRoleIds.push(otherId);

    const res = await request(app)
      .put(`/api/v1/admin/rbac/roles/${otherId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: roleName });

    expect(res.status).toBe(409);
  });
});

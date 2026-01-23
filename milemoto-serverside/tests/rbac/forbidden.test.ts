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

let readOnlyToken = '';
let noPermToken = '';

beforeAll(async () => {
  await ensureEmailVerifiedAtNullable();
  const readPerm = await ensurePermission({
    slug: 'rbac.read',
    description: 'View roles',
    resourceGroup: 'System',
  });
  if (readPerm.created) createdPermissionIds.push(readPerm.id);

  const readRoleId = await createRoleWithPermissions({
    name: `RBAC ReadOnly ${Date.now()}`,
    permissionIds: [readPerm.id],
  });
  createdRoleIds.push(readRoleId);

  const readUser = await createAdminUser({
    email: `rbac-read-${Date.now()}@milemoto.local`,
    password: 'Password123!',
    roleId: readRoleId,
  });
  createdUserIds.push(readUser.id);

  const noPermUser = await createAdminUser({
    email: `rbac-none-${Date.now()}@milemoto.local`,
    password: 'Password123!',
    roleId: null,
  });
  createdUserIds.push(noPermUser.id);

  const readLogin = await request(app).post('/api/v1/auth/login').send({
    identifier: readUser.email,
    password: readUser.password,
    remember: false,
  });
  readOnlyToken = readLogin.body?.accessToken ?? '';
  if (!readOnlyToken) throw new Error('Missing read-only token');

  const noPermLogin = await request(app).post('/api/v1/auth/login').send({
    identifier: noPermUser.email,
    password: noPermUser.password,
    remember: false,
  });
  noPermToken = noPermLogin.body?.accessToken ?? '';
  if (!noPermToken) throw new Error('Missing no-permission token');
});

afterAll(async () => {
  await cleanupRbac({
    userIds: createdUserIds,
    roleIds: createdRoleIds,
    permissionIds: createdPermissionIds,
  });
});

describe('rbac permission enforcement', () => {
  it('blocks role creation without manage permission', async () => {
    const res = await request(app)
      .post('/api/v1/admin/rbac/roles')
      .set('Authorization', `Bearer ${readOnlyToken}`)
      .send({ name: `Blocked ${Date.now()}` });

    expect(res.status).toBe(403);
  });

  it('blocks read endpoints without read permission', async () => {
    const res = await request(app)
      .get('/api/v1/admin/rbac/permissions')
      .set('Authorization', `Bearer ${noPermToken}`);

    expect(res.status).toBe(403);
  });
});

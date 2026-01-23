import argon2 from 'argon2';
import crypto from 'node:crypto';
import request from 'supertest';
import { inArray } from 'drizzle-orm';
import { db } from '../../src/db/drizzle.js';
import { permissions, rolepermissions, roles, users } from '@milemoto/types';
import { app } from '../../src/app.js';
import { ensureEmailVerifiedAtNullable } from '../auth/helpers.js';

export type PermissionSeed = {
  slug: string;
  description: string;
  resourceGroup: string;
};

export async function ensurePermission(seed: PermissionSeed) {
  const [existing] = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(inArray(permissions.slug, [seed.slug]))
    .limit(1);
  if (existing?.id) {
    return { id: Number(existing.id), created: false };
  }

  const inserted = await db
    .insert(permissions)
    .values({
      slug: seed.slug,
      description: seed.description,
      resourceGroup: seed.resourceGroup,
    })
    .$returningId();
  const id = inserted[0]?.id ? Number(inserted[0].id) : NaN;
  if (!Number.isFinite(id)) throw new Error('Failed to seed permission');
  return { id, created: true };
}

async function createRoleWithPermissions(params: {
  name: string;
  permissionIds: number[];
}) {
  const inserted = await db
    .insert(roles)
    .values({
      name: params.name,
      description: null,
      isSystem: false,
    })
    .$returningId();
  const roleId = inserted[0]?.id ? Number(inserted[0].id) : NaN;
  if (!Number.isFinite(roleId)) throw new Error('Failed to create role');

  if (params.permissionIds.length) {
    await db.insert(rolepermissions).values(
      params.permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      }))
    );
  }

  return roleId;
}

async function createAdminUser(params: { email: string; password: string; roleId: number }) {
  const hash = await argon2.hash(params.password, { type: argon2.argon2id });
  const inserted = await db
    .insert(users)
    .values({
      fullName: 'Catalog Test Admin',
      email: params.email.toLowerCase(),
      passwordHash: hash,
      role: 'admin',
      roleId: params.roleId,
      status: 'active',
      emailVerifiedAt: new Date(),
    })
    .$returningId();
  const id = inserted[0]?.id ? Number(inserted[0].id) : NaN;
  if (!Number.isFinite(id)) throw new Error('Failed to create admin user');
  return { id, email: params.email, password: params.password };
}

export async function createCatalogAdmin(permissionSeeds: PermissionSeed[]) {
  await ensureEmailVerifiedAtNullable();

  const runId = crypto.randomUUID();
  const permissionIds: number[] = [];
  const rolePermissionIds: number[] = [];
  for (const seed of permissionSeeds) {
    const created = await ensurePermission(seed);
    rolePermissionIds.push(created.id);
    if (created.created) permissionIds.push(created.id);
  }

  const roleId = await createRoleWithPermissions({
    name: `Catalog Admin ${runId}`,
    permissionIds: rolePermissionIds,
  });

  const admin = await createAdminUser({
    email: `catalog-admin-${runId}@milemoto.local`,
    password: 'Password123!',
    roleId,
  });

  const loginRes = await request(app).post('/api/v1/auth/login').send({
    identifier: admin.email,
    password: admin.password,
    remember: false,
  });
  const accessToken = loginRes.body?.accessToken ?? '';
  if (!accessToken) throw new Error('Missing access token');

  return {
    accessToken,
    roleId,
    userId: admin.id,
    createdPermissionIds: permissionIds,
  };
}

export async function cleanupCatalogAuth(params: {
  userIds: number[];
  roleIds: number[];
  permissionIds: number[];
}) {
  if (params.roleIds.length) {
    await db.delete(rolepermissions).where(inArray(rolepermissions.roleId, params.roleIds));
    await db.delete(roles).where(inArray(roles.id, params.roleIds));
  }
  if (params.permissionIds.length) {
    await db.delete(permissions).where(inArray(permissions.id, params.permissionIds));
  }
  if (params.userIds.length) {
    await db.delete(users).where(inArray(users.id, params.userIds));
  }
}

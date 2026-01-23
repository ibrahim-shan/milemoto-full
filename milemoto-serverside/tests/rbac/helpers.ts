import argon2 from 'argon2';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../src/db/drizzle.js';
import { permissions, rolepermissions, roles, users } from '@milemoto/types';

export type TestRbacUser = { id: number; email: string; password: string };

export type PermissionSeed = {
  slug: string;
  description: string;
  resourceGroup: string;
};

export async function ensurePermission(seed: PermissionSeed) {
  const [existing] = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(eq(permissions.slug, seed.slug))
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

export async function createRoleWithPermissions(params: {
  name: string;
  permissionIds: number[];
  isSystem?: boolean;
  description?: string | null;
}) {
  const inserted = await db
    .insert(roles)
    .values({
      name: params.name,
      description: params.description ?? null,
      isSystem: params.isSystem ?? false,
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

export async function createAdminUser(params: {
  email: string;
  password: string;
  roleId: number | null;
}) {
  const hash = await argon2.hash(params.password, { type: argon2.argon2id });
  const inserted = await db
    .insert(users)
    .values({
      fullName: 'RBAC Test Admin',
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
  return { id, email: params.email, password: params.password } satisfies TestRbacUser;
}

export async function cleanupRbac(params: {
  userIds: number[];
  roleIds: number[];
  permissionIds: number[];
}) {
  if (params.roleIds.length) {
    await db.delete(rolepermissions).where(inArray(rolepermissions.roleId, params.roleIds));
    await db.delete(roles).where(inArray(roles.id, params.roleIds));
  }
  if (params.permissionIds.length) {
    await db
      .delete(permissions)
      .where(and(inArray(permissions.id, params.permissionIds), eq(permissions.resourceGroup, 'System')));
  }
  if (params.userIds.length) {
    await db.delete(users).where(inArray(users.id, params.userIds));
  }
}

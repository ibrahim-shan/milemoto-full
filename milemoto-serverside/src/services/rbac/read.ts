import { and, asc, eq, like, or } from 'drizzle-orm';
import { permissions, rolepermissions, roles, users } from '@milemoto/types';
import type { PermissionResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { mapPermission, mapRole } from './shared.js';

export async function listPermissions(): Promise<PermissionResponse[]> {
  const rows = await db
    .select()
    .from(permissions)
    .orderBy(asc(permissions.resourceGroup), asc(permissions.slug));
  return rows.map(mapPermission);
}

export async function listRoles(search?: string) {
  const filters = [
    search
      ? or(like(roles.name, `%${search}%`), like(roles.description, `%${search}%`))
      : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const rows = await db.select().from(roles).where(where).orderBy(asc(roles.name));
  return rows.map(mapRole);
}

export async function getRole(id: number) {
  const [row] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!row) {
    throw httpError(404, 'NotFound', 'Role not found');
  }
  const role = mapRole(row);

  const perms = await db
    .select({
      id: permissions.id,
      slug: permissions.slug,
      description: permissions.description,
      resourceGroup: permissions.resourceGroup,
      createdAt: permissions.createdAt,
      updatedAt: permissions.updatedAt,
    })
    .from(permissions)
    .innerJoin(rolepermissions, eq(rolepermissions.permissionId, permissions.id))
    .where(eq(rolepermissions.roleId, id));

  role.permissions = perms.map((p) => mapPermission(p));
  return role;
}

export async function getUserPermissions(userId: number) {
  const rows = await db
    .select({
      slug: permissions.slug,
    })
    .from(permissions)
    .innerJoin(rolepermissions, eq(rolepermissions.permissionId, permissions.id))
    .innerJoin(users, eq(users.roleId, rolepermissions.roleId))
    .where(eq(users.id, userId));

  return Array.from(new Set(rows.map((r) => r.slug as string)));
}
